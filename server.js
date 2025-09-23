const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors());
app.use(express.json());

// Middleware to authenticate admin users
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Main verification endpoint
app.post('/verify', async (req, res) => {
  try {
    const { api_key, device_id } = req.body;

    if (!api_key || !device_id) {
      return res.status(400).json({
        valid: false,
        error: 'api_key and device_id are required'
      });
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
      .single();

    if (keyError || !keyData) {
      return res.json({
        valid: false,
        error: 'Invalid API key'
      });
    }

    const { users: user, products: product, subscriptions: subscription } = keyData;

    // Check if product is active (kill switch)
    if (!product.is_active) {
      return res.json({
        valid: false,
        product: product.name,
        active: false,
        message: 'This product is no longer available.'
      });
    }

    // Handle device binding
    if (!keyData.device_id) {
      // First use - bind to device
      await supabase
        .from('api_keys')
        .update({ device_id })
        .eq('id', keyData.id);
    } else if (keyData.device_id !== device_id) {
      // Different device
      return res.json({
        valid: false,
        error: 'API key is bound to a different device',
        message: 'Use /release-device to unbind this key first.'
      });
    }

    // Handle trial logic for free users
    if (subscription.status === 'free' && product.trial_enabled && !subscription.trial_used) {
      // Start trial
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 1 day trial

      await supabase
        .from('subscriptions')
        .update({
          status: 'trial',
          expires_at: expiresAt.toISOString(),
          trial_used: true
        })
        .eq('id', subscription.id);

      return res.json({
        valid: true,
        user: user.full_name || user.email,
        product: product.name,
        status: 'trial',
        days_left: 1,
        expires_at: expiresAt.toISOString(),
        device_id,
        message: 'Trial activated! You have 1 day of premium access.'
      });
    }

    // Check subscription status
    const now = new Date();
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

    // Auto-revert expired subscriptions
    if ((subscription.status === 'trial' || subscription.status === 'premium') && 
        expiresAt && expiresAt < now) {
      await supabase
        .from('subscriptions')
        .update({ status: 'free', expires_at: null })
        .eq('id', subscription.id);
      
      subscription.status = 'free';
      subscription.expires_at = null;
    }

    // Prepare response based on status
    const response = {
      valid: true,
      user: user.full_name || user.email,
      product: product.name,
      status: subscription.status,
      device_id
    };

    if (subscription.status === 'premium' || subscription.status === 'trial') {
      const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      response.days_left = Math.max(0, daysLeft);
      response.expires_at = subscription.expires_at;
    }

    if (subscription.status === 'free' && !product.trial_enabled) {
      response.message = 'Trial not available for this product.';
    }

    res.json(response);

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
});

// Release device binding
app.post('/release-device', async (req, res) => {
  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({ error: 'api_key is required' });
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update({ device_id: null })
      .eq('key_value', api_key)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      success: true,
      message: 'Device binding released successfully'
    });

  } catch (error) {
    console.error('Release device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes
app.get('/admin/products', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/products', requireAdmin, async (req, res) => {
  try {
    const { name, description, price, duration_days, trial_enabled, is_active } = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        description,
        price: parseFloat(price) || 0,
        duration_days: parseInt(duration_days) || 30,
        trial_enabled: Boolean(trial_enabled),
        is_active: Boolean(is_active)
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration_days, trial_enabled, is_active } = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .update({
        name,
        description,
        price: parseFloat(price),
        duration_days: parseInt(duration_days),
        trial_enabled: Boolean(trial_enabled),
        is_active: Boolean(is_active)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin user management
app.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        subscriptions(
          id,
          status,
          expires_at,
          products(name)
        ),
        api_keys(
          id,
          device_id,
          products(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/admin/users/:id/subscription', requireAdmin, async (req, res) => {
  try {
    const { id: user_id } = req.params;
    const { product_id, status, days } = req.body;

    let updateData = { status };
    
    if (status === 'premium' && days) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(days));
      updateData.expires_at = expiresAt.toISOString();
    } else if (status === 'free') {
      updateData.expires_at = null;
    }

    // Ensure subscription exists first
    await supabase.rpc('ensure_subscription', {
      p_user_id: user_id,
      p_product_id: product_id
    });

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', user_id)
      .eq('product_id', product_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/users/:id/release-device', requireAdmin, async (req, res) => {
  try {
    const { id: user_id } = req.params;
    const { product_id } = req.body;

    const { data, error } = await supabase
      .from('api_keys')
      .update({ device_id: null })
      .eq('user_id', user_id)
      .eq('product_id', product_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Device binding released' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});

module.exports = app;