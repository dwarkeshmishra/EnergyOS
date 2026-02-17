@echo off
echo ============================================
echo   Smart Energy PaaS - Development Setup
echo ============================================
echo.

echo [1/4] Installing backend dependencies...
cd backend
call npm install
cd ..

echo [2/4] Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo [3/4] Setting up database...
echo Make sure PostgreSQL is running and update backend/.env with your credentials
echo Then run: cd backend ^&^& node src/database/migrate.js ^&^& node src/database/seed.js
echo.

echo [4/4] Ready! Start the services:
echo   Backend:  cd backend  ^&^& npm run dev
echo   Frontend: cd frontend ^&^& npm run dev
echo.
echo   Or use Docker: docker-compose up --build
echo ============================================
pause
