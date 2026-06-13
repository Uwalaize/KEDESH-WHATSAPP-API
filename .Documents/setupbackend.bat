mkdir backend
cd backend
npm init -y

# Install packages za msingi
npm install express cors dotenv axios socket.io pg

# Install Prisma kwa ajili ya Database
npm install prisma @prisma/client

# Install nodemon kwa kurahisisha development
npm install --save-dev nodemon

# Anzisha Prisma (Hii itatengeneza folder la prisma na faili la .env)
npx prisma init