require('dotenv').config();
const Admin = require('./models/Admin');

const seedAdmin = async () => {
  try {
    const email = 'vivek@gmail.com';
    const password = '706876';

    // Check if admin already exists
    const adminExists = await Admin.findOne({ email });

    if (adminExists) {
      console.log(`[Seed] Admin with email ${email} already exists.`);
      // Update password just in case they want to reset it
      adminExists.password = password;
      adminExists.role = 'admin';
      await adminExists.save();
    } else {
      // Create new admin
      await Admin.create({
        name: 'Vivek Admin',
        email: email,
        password: password,
        role: 'admin'
      });
      console.log(`[Seed] New Admin created successfully with email: ${email}`);
    }
  } catch (error) {
    console.error('[Seed] Error seeding admin:', error);
  }
};

module.exports = seedAdmin;
