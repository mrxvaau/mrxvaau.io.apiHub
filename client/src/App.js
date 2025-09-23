import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'your-supabase-url',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key'
);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('login');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
      setCurrentView(data.is_admin ? 'admin' : 'dashboard');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthComponent setCurrentView={setCurrentView} currentView={currentView} />;
  }

  if (user?.is_admin) {
    return <AdminDashboard user={user} session={session} />;
  }

  return <UserDashboard user={user} session={session} />;
}

// Authentication Component
function AuthComponent({ setCurrentView, currentView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showMessage(error.message, 'error');
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    
    if (password.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }
    
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      showMessage(error.message, 'error');
    } else {
      showMessage('Check your email for the confirmation link!', 'success');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      showMessage('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      showMessage(error.message, 'error');
    } else {
      showMessage('Password reset email sent!', 'success');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {currentView === 'login' ? 'Welcome Back' : 
             currentView === 'signup' ? 'Create Account' : 
             'Reset Password'}
          </h1>
          <p className="text-gray-600">
            {currentView === 'login' ? 'Sign in to your API Key Management account' : 
             currentView === 'signup' ? 'Get started with your new account' : 
             'Enter your email to reset your password'}
          </p>
        </div>
        
        {/* Auth Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
          {message && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              messageType === 'error' ? 'bg-red-50 border-red-400 text-red-700' : 
              messageType === 'success' ? 'bg-green-50 border-green-400 text-green-700' : 
              'bg-blue-50 border-blue-400 text-blue-700'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {messageType === 'error' ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={
            currentView === 'login' ? handleLogin : 
            currentView === 'signup' ? handleSignUp : 
            handleResetPassword
          }>
            <div className="space-y-4">
              {currentView === 'signup' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              {currentView !== 'reset' && (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  
                  {currentView === 'signup' && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  <>
                    {currentView === 'login' ? 'Sign In' : 
                     currentView === 'signup' ? 'Create Account' : 
                     'Send Reset Link'}
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center space-x-1 text-sm">
              {currentView === 'login' && (
                <>
                  <span className="text-gray-600">Don't have an account?</span>
                  <button
                    type="button"
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    onClick={() => setCurrentView('signup')}
                  >
                    Sign up
                  </button>
                  <span className="text-gray-400">•</span>
                  <button
                    type="button"
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    onClick={() => setCurrentView('reset')}
                  >
                    Forgot password?
                  </button>
                </>
              )}
              {(currentView === 'signup' || currentView === 'reset') && (
                <>
                  <span className="text-gray-600">Already have an account?</span>
                  <button
                    type="button"
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    onClick={() => setCurrentView('login')}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Secure API Key Management System
          </p>
        </div>
      </div>
    </div>
  );
}

// User Dashboard
function UserDashboard({ user, session }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: keysData, error: keysError } = await supabase
        .from('api_keys')
        .select(`
          *,
          products(name, description, is_active),
          subscriptions(status, expires_at)
        `)
        .eq('user_id', user.id);

      if (keysError) throw keysError;
      setApiKeys(keysData || []);

      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          products(name, description, price, trial_enabled, is_active)
        `)
        .eq('user_id', user.id);

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const releaseDevice = async (apiKey) => {
    try {
      const response = await fetch(`${API_BASE_URL}/release-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Device released successfully!');
        fetchUserData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error releasing device:', error);
      setMessage('Error releasing device');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.full_name || user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* API Keys Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your API Keys</h2>
            </div>
            <div className="p-6">
              {apiKeys.length === 0 ? (
                <p className="text-gray-500">No API keys found. Contact admin to get access to products.</p>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{key.products?.name}</h3>
                          <p className="text-sm text-gray-600">{key.products?.description}</p>
                          <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-2">{key.key_value}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Status: <span className={`font-medium ${key.products?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                              {key.products?.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                          {key.device_id && (
                            <p className="text-sm text-gray-500">
                              Device: <span className="font-mono">{key.device_id}</span>
                            </p>
                          )}
                        </div>
                        {key.device_id && (
                          <button
                            onClick={() => releaseDevice(key.key_value)}
                            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                          >
                            Release Device
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subscriptions Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your Subscriptions</h2>
            </div>
            <div className="p-6">
              {subscriptions.length === 0 ? (
                <p className="text-gray-500">No subscriptions found.</p>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{sub.products?.name}</h3>
                          <p className="text-sm text-gray-600">{sub.products?.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Status: <span className={`font-medium ${
                              sub.status === 'premium' ? 'text-green-600' : 
                              sub.status === 'trial' ? 'text-blue-600' : 
                              'text-gray-600'
                            }`}>
                              {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                            </span>
                          </p>
                          {sub.expires_at && (
                            <p className="text-sm text-gray-500">
                              Expires: {new Date(sub.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-medium text-gray-900">
                            ${sub.products?.price}
                          </p>
                          <p className="text-sm text-gray-500">
                            Trial: {sub.products?.trial_enabled ? 'Available' : 'Not available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard({ user, session }) {
  const [currentTab, setCurrentTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentTab === 'products') {
      fetchProducts();
    } else if (currentTab === 'users') {
      fetchUsers();
    }
  }, [currentTab]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.full_name || user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
          
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setCurrentTab('products')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'products'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setCurrentTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
            {message}
          </div>
        )}

        {currentTab === 'products' && (
          <ProductsTab 
            products={products} 
            setProducts={setProducts} 
            session={session}
            setMessage={setMessage}
          />
        )}
        
        {currentTab === 'users' && (
          <UsersTab 
            users={users} 
            setUsers={setUsers} 
            products={products}
            session={session}
            setMessage={setMessage}
          />
        )}
      </div>
    </div>
  );
}

// Products Tab Component
function ProductsTab({ products, setProducts, session, setMessage }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
    duration_days: '30',
    trial_enabled: true,
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '0',
      duration_days: '30',
      trial_enabled: true,
      is_active: true
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingProduct 
      ? `${API_BASE_URL}/admin/products/${editingProduct.id}`
      : `${API_BASE_URL}/admin/products`;
    
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (editingProduct) {
          setProducts(products.map(p => p.id === editingProduct.id ? data : p));
          setMessage('Product updated successfully!');
        } else {
          setProducts([data, ...products]);
          setMessage('Product created successfully!');
        }
        resetForm();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      duration_days: product.duration_days.toString(),
      trial_enabled: product.trial_enabled,
      is_active: product.is_active
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setProducts(products.filter(p => p.id !== product.id));
        setMessage('Product deleted successfully!');
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Products Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Add Product
        </button>
      </div>

      {showAddForm && (
        <div className="border-b border-gray-200 p-6 bg-gray-50">
          <h3 className="text-lg font-medium mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.trial_enabled}
                  onChange={(e) => setFormData({...formData, trial_enabled: e.target.checked})}
                  className="mr-2"
                />
                Trial Enabled
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="mr-2"
                />
                Active
              </label>
            </div>
            <div className="col-span-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                {editingProduct ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6">
        {products.length === 0 ? (
          <p className="text-gray-500">No products found.</p>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900 flex items-center">
                      {product.name}
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        product.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600">{product.description}</p>
                    <div className="text-sm text-gray-500 mt-2 space-y-1">
                      <p>Price: ${product.price} • Duration: {product.duration_days} days</p>
                      <p>Trial: {product.trial_enabled ? 'Enabled' : 'Disabled'}</p>
                      <p>Created: {new Date(product.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Users Tab Component
function UsersTab({ users, setUsers, products, session, setMessage }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState({
    product_id: '',
    status: 'free',
    days: '30'
  });

  const updateSubscription = async (e) => {
    e.preventDefault();
    if (!selectedUser || !subForm.product_id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.id}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(subForm),
      });

      if (response.ok) {
        setMessage('Subscription updated successfully!');
        setShowSubModal(false);
        // Refresh users data would go here
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const releaseDevice = async (userId, productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/release-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ product_id: productId }),
      });

      if (response.ok) {
        setMessage('Device released successfully!');
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Users Management</h2>
      </div>
      
      <div className="p-6">
        {users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900 flex items-center">
                      {user.full_name || user.email}
                      {user.is_admin && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-sm text-gray-500">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                    
                    {user.subscriptions && user.subscriptions.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">Subscriptions:</h4>
                        <div className="space-y-1">
                          {user.subscriptions.map((sub, idx) => (
                            <div key={idx} className="text-sm text-gray-600 flex justify-between items-center">
                              <span>
                                {sub.products?.name}: <span className={`font-medium ${
                                  sub.status === 'premium' ? 'text-green-600' : 
                                  sub.status === 'trial' ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                  {sub.status}
                                </span>
                                {sub.expires_at && ` (expires ${new Date(sub.expires_at).toLocaleDateString()})`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.api_keys && user.api_keys.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">API Keys:</h4>
                        <div className="space-y-1">
                          {user.api_keys.map((key, idx) => (
                            <div key={idx} className="text-sm text-gray-600 flex justify-between items-center">
                              <span>
                                {key.products?.name}
                                {key.device_id && ` • Device: ${key.device_id}`}
                              </span>
                              {key.device_id && (
                                <button
                                  onClick={() => releaseDevice(user.id, key.product_id)}
                                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                                >
                                  Release
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowSubModal(true);
                    }}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                  >
                    Manage Subscription
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription Modal */}
      {showSubModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">
              Manage Subscription for {selectedUser.full_name || selectedUser.email}
            </h3>
            <form onSubmit={updateSubscription}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    value={subForm.product_id}
                    onChange={(e) => setSubForm({...subForm, product_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={subForm.status}
                    onChange={(e) => setSubForm({...subForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                {subForm.status === 'premium' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (days)
                    </label>
                    <input
                      type="number"
                      value={subForm.days}
                      onChange={(e) => setSubForm({...subForm, days: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;