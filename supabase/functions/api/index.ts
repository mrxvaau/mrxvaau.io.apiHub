import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("API Edge Function started")

serve(async (req) => {
  const { url, method } = req

  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const urlObj = new URL(url)
    const path = urlObj.pathname.replace('/api', '')

    // Route handling
    if (path === '/verify' && method === 'POST') {
      return await handleVerify(req, supabase)
    } else if (path === '/release-device' && method === 'POST') {
      return await handleReleaseDevice(req, supabase)
    } else if (path.startsWith('/admin/')) {
      return await handleAdminRoutes(req, supabase, path, method)
    } else {
      return new Response(
        JSON.stringify({ error: 'Route not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleVerify(req: Request, supabase: any) {
  const body = await req.json()
  const { api_key, device_id } = body

  if (!api_key || !device_id) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'api_key and device_id are required'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Get API key and related data
  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select(`
      *,
      users!inner(full_name, email),
      products!inner(name, description, is_active, trial_enabled, duration_days),
      subscriptions!inner(status, expires_at, trial_used)
    `)
    .eq('key_value', api_key)
    .single()

  if (keyError || !keyData) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Invalid API key'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { users: user, products: product, subscriptions: subscription } = keyData

  // Check if product is active (kill switch)
  if (!product.is_active) {
    return new Response(
      JSON.stringify({
        valid: false,
        product: product.name,
        active: false,
        message: 'This product is no longer available.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Handle device binding
  if (!keyData.device_id) {
    await supabase
      .from('api_keys')
      .update({ device_id })
      .eq('id', keyData.id)
  } else if (keyData.device_id !== device_id) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'API key is bound to a different device',
        message: 'Use /release-device to unbind this key first.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Handle trial logic
  if (subscription.status === 'free' && product.trial_enabled && !subscription.trial_used) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 1)

    await supabase
      .from('subscriptions')
      .update({
        status: 'trial',
        expires_at: expiresAt.toISOString(),
        trial_used: true
      })
      .eq('id', subscription.id)

    return new Response(
      JSON.stringify({
        valid: true,
        user: user.full_name || user.email,
        product: product.name,
        status: 'trial',
        days_left: 1,
        expires_at: expiresAt.toISOString(),
        device_id,
        message: 'Trial activated! You have 1 day of premium access.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check subscription status
  const now = new Date()
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null

  // Auto-revert expired subscriptions
  if ((subscription.status === 'trial' || subscription.status === 'premium') && 
      expiresAt && expiresAt < now) {
    await supabase
      .from('subscriptions')
      .update({ status: 'free', expires_at: null })
      .eq('id', subscription.id)
    
    subscription.status = 'free'
    subscription.expires_at = null
  }

  const response: any = {
    valid: true,
    user: user.full_name || user.email,
    product: product.name,
    status: subscription.status,
    device_id
  }

  if (subscription.status === 'premium' || subscription.status === 'trial') {
    const daysLeft = Math.ceil((expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    response.days_left = Math.max(0, daysLeft)
    response.expires_at = subscription.expires_at
  }

  if (subscription.status === 'free' && !product.trial_enabled) {
    response.message = 'Trial not available for this product.'
  }

  return new Response(
    JSON.stringify(response),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleReleaseDevice(req: Request, supabase: any) {
  const body = await req.json()
  const { api_key } = body

  if (!api_key) {
    return new Response(
      JSON.stringify({ error: 'api_key is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabase
    .from('api_keys')
    .update({ device_id: null })
    .eq('key_value', api_key)
    .select()
    .single()

  if (error || !data) {
    return new Response(
      JSON.stringify({ error: 'API key not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Device binding released successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleAdminRoutes(req: Request, supabase: any, path: string, method: string) {
  // Add admin authentication logic here
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'No token provided' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // For now, just return a placeholder response
  return new Response(
    JSON.stringify({ message: 'Admin routes would be implemented here' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}