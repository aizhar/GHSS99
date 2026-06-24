// Generates a bcrypt hash for the admin password.
//
// Usage:
//   npm run hash-password -- "your-strong-password"
//   (or run with no argument and it will prompt you)
//
// Copy the printed hash into ADMIN_PASSWORD_HASH in your .env file and in
// Vercel's Environment Variables.

const bcrypt = require('bcryptjs');
const readline = require('readline');

const SALT_ROUNDS = 12;

function hashAndPrint(password) {
  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  console.log('\nBcrypt hash (set this as ADMIN_PASSWORD_HASH):\n');
  console.log(hash + '\n');
}

const argPassword = process.argv[2];

if (argPassword) {
  hashAndPrint(argPassword);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter admin password to hash: ', (answer) => {
    rl.close();
    hashAndPrint(answer.trim());
  });
}
