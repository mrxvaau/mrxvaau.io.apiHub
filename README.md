# 🔑 API Membership Hub

A complete, secure membership website for selling API keys with subscription management. Built with HTML, JavaScript, and Supabase backend.

## ✨ Features

### 🔐 **Secure Authentication**
- User registration with email verification
- Secure login/logout system
- Password reset functionality
- No authentication bypass possible

### 👤 **User Dashboard**
- Personal API key generation and display
- Subscription status (Free/Trial/Premium)
- One-click WhatsApp integration for upgrades
- Copy API key functionality
- Device restriction ready

### 🛠 **Admin Panel**
- Complete user management
- One-click subscription activation/deactivation
- Real-time user status updates
- Clean tabbed interface

### 🎨 **Professional Design**
- Modern gradient design with animations
- Fully responsive (mobile-friendly)
- Clean card-based layout
- WhatsApp-branded upgrade buttons

## 🚀 Quick Start

### Prerequisites
- Supabase account (free)
- WhatsApp Business number
- Web hosting (Netlify/Vercel recommended)

### 1. Clone/Download Files
```bash
git clone your-repo-url
cd api-membership-hub
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create new project
2. Copy your project URL and anon key
3. Run the SQL setup (see Database Setup below)

### 3. Configure Application
Create `config.js` file:
```javascript
window.CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    WHATSAPP_NUMBER: '1234567890' // Your WhatsApp number
};
```

### 4. Deploy
**Option A: Netlify (Recommended)**
- Drag & drop your folder to [netlify.com](https://netlify.com)
- Site goes live instantly with HTTPS

**Option B: Vercel**
```bash
npm i -g vercel
vercel
```

**Option C: Private GitHub Repo + Pages**
- Create private repository
- Upload files including config.js
- Enable GitHub Pages

## 🗄️ Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Users table
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    subscription_status TEXT DEFAULT 'free',
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Products table (for future expansion)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL,
    duration_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own data" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Insert default products
INSERT INTO products (name, price, duration_days) VALUES
('Trial Access', 5.00, 1),
('Premium 15 Days', 25.00, 15),
('Premium 30 Days', 45.00, 30);
```

## 👨‍💼 Admin Setup

After registering your account, make yourself admin:

```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

## 📱 Business Workflow

### Customer Journey:
1. **User registers** → Gets free API key
2. **User wants premium** → Clicks WhatsApp button
3. **Pre-filled message sent** with their API key
4. **You receive payment** → Activate from admin panel
5. **User status updates** → Immediate access

### Your Workflow:
1. **Receive WhatsApp** with API key
2. **Process payment** (PayPal, Stripe, etc.)
3. **Login to admin panel**
4. **Find user by API key**
5. **Click activate button**
6. **User gets instant access**

## 🔒 Security Features

### Built-in Security:
- ✅ Supabase authentication (JWT tokens)
- ✅ Row-level security policies
- ✅ Email verification required
- ✅ Password strength validation
- ✅ No direct database access
- ✅ CORS protection
- ✅ Input sanitization

### Configuration Security:
- ✅ Keys in separate config file
- ✅ .gitignore prevents public exposure
- ✅ Environment variable support
- ✅ Private deployment options

## 🛠️ Customization

### Branding:
- Change logo and colors in CSS
- Update company name in HTML
- Modify pricing in dashboard

### Features:
- Add more subscription tiers
- Integrate payment processors
- Add email notifications
- Extend admin panel

### WhatsApp Integration:
Replace `WHATSAPP_NUMBER` in config.js:
```javascript
WHATSAPP_NUMBER: '1234567890' // Format: country code + number
```

## 🔌 Python Script Integration

Your Python script can validate API keys by querying:

```python
import requests

def validate_api_key(api_key):
    # Query your Supabase endpoint
    url = f"https://your-project.supabase.co/rest/v1/users?api_key=eq.{api_key}"
    headers = {
        "apikey": "your-anon-key",
        "Authorization": "Bearer your-anon-key"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200 and response.json():
        user = response.json()[0]
        return user['subscription_status'] != 'free'
    return False
```

## 📁 File Structure

```
api-membership-hub/
├── index.html              # Main application
├── config.js               # Configuration (KEEP PRIVATE)
├── .gitignore             # Prevents sensitive file commits
├── README.md              # This file
└── sql/
    └── setup.sql          # Database setup script
```

## 🚨 Security Warnings

### ⚠️ NEVER commit these files to public repos:
- `config.js` (contains your keys)
- `.env` files
- Any file with credentials

### ✅ Safe to make public:
- `index.html` (without hardcoded keys)
- `.gitignore`
- `README.md`
- CSS/JS files (without credentials)

## 🆘 Troubleshooting

### Common Issues:

**"Supabase client not initialized"**
- Check if config.js is loaded
- Verify your Supabase URL and key

**"Users can't register"**
- Check email confirmation settings in Supabase
- Verify RLS policies are set correctly

**"Admin panel not showing"**
- Make sure you set `is_admin = true` for your account
- Check browser console for errors

**"WhatsApp links not working"**
- Verify WhatsApp number format (country code + number)
- Test links manually

## 🔄 Updates & Maintenance

### Regular Tasks:
- Monitor user registrations
- Process subscription activations
- Update pricing/features as needed
- Backup database periodically

### Adding Features:
- Modify HTML for UI changes
- Update Supabase policies for new permissions
- Extend database schema for new data

## 📞 Support

### For Users:
Direct them to your WhatsApp for subscription issues

### For Technical Issues:
- Check Supabase logs
- Review browser console
- Verify database connections
- Test with different browsers

## 📄 License

This project is for commercial use. Customize as needed for your business.

---

## 🎯 Next Steps

1. **Setup Supabase** and run SQL commands
2. **Create config.js** with your credentials  
3. **Deploy to Netlify/Vercel**
4. **Test complete user flow**
5. **Make yourself admin**
6. **Start selling API keys!**

**Need help?** Check the troubleshooting section or review the code comments for guidance.
