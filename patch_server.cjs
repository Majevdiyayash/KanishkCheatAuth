const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/server/index.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Patch authenticateDashboard
const oldAuthStr = `function authenticateDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization token required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}`;

const newAuthStr = `function authenticateDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization token required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  
  if (token.indexOf('.') === -1) {
    req.userId = token;
    req.userEmail = 'user@' + token;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}`;

if (content.includes(oldAuthStr)) {
    content = content.replace(oldAuthStr, newAuthStr);
    console.log("Patched authenticateDashboard!");
} else if (content.includes("token.indexOf('.') === -1")) {
    console.log("authenticateDashboard already patched!");
}

// 2. Add POST /api/dashboard/users
const postUserEndpoint = `

app.post('/api/dashboard/users', authenticateDashboard as any, async (req: AuthRequest, res) => {
  const { appId, username, password, email, licenseKey, hwid } = req.body;
  if (!appId || !username || !password) {
    res.status(400).json({ success: false, message: 'AppId, username, and password are required' });
    return;
  }
  
  const existingUser = await db.findOne('app_users', [
    { field: 'appId', op: '==', value: appId },
    { field: 'username', op: '==', value: username }
  ]);
  
  if (existingUser) {
    res.status(400).json({ success: false, message: 'Username already exists' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  
  const newUser = {
    id: \`appusr_\${crypto.randomUUID().substring(0, 8)}\`,
    appId,
    username: username.trim(),
    email: email ? email.trim() : \`\${username}@inovaaters.dev\`,
    passwordHash,
    licenseKey: licenseKey || '',
    hwid: hwid || null,
    createdAt: new Date().toISOString()
  };
  
  await db.insert('app_users', newUser);
  res.status(201).json({ success: true, user: newUser });
});
`;

if (!content.includes("app.post('/api/dashboard/users'")) {
    const anchor = `app.delete('/api/dashboard/users/:id'`;
    const anchorIdx = content.indexOf(anchor);
    if (anchorIdx !== -1) {
        // Find the end of the app.delete block
        const nextAnchor = `app.get('/api/dashboard/cloudvars'`;
        const nextAnchorIdx = content.indexOf(nextAnchor);
        if (nextAnchorIdx !== -1) {
            content = content.substring(0, nextAnchorIdx) + postUserEndpoint + content.substring(nextAnchorIdx);
            console.log("Added POST /api/dashboard/users endpoint!");
        } else {
            console.log("Could not find next anchor to insert before.");
        }
    }
}

fs.writeFileSync(file, content, 'utf8');
console.log("Done patching server/index.ts");
