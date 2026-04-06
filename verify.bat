@echo off
REM Verbex Deployment Verification Script (Windows)

setlocal enabledelayedexpansion

set "AUTH_URL=http://localhost:8081"
set "AGENT_URL=http://localhost:8082"
set "CHAT_URL=http://localhost:8083"
set "FRONTEND_URL=http://localhost:3000"

set /a TESTS_PASSED=0
set /a TESTS_FAILED=0

echo.
echo Verbex Platform Verification Script (Windows)
echo =============================================
echo.

echo Health Checks:
echo Testing Auth Service...
curl -s "%AUTH_URL%/health" >nul 2>&1 && (
    echo [OK] Auth Service Health
    set /a TESTS_PASSED+=1
) || (
    echo [FAIL] Auth Service Health
    set /a TESTS_FAILED+=1
)

echo Testing Agent Service...
curl -s "%AGENT_URL%/health" >nul 2>&1 && (
    echo [OK] Agent Service Health
    set /a TESTS_PASSED+=1
) || (
    echo [FAIL] Agent Service Health
    set /a TESTS_FAILED+=1
)

echo Testing Chat Service...
curl -s "%CHAT_URL%/health" >nul 2>&1 && (
    echo [OK] Chat Service Health
    set /a TESTS_PASSED+=1
) || (
    echo [FAIL] Chat Service Health
    set /a TESTS_FAILED+=1
)

echo.
echo Testing Available Models Endpoint...
curl -s "%AGENT_URL%/models" >nul 2>&1 && (
    echo [OK] Models Endpoint
    set /a TESTS_PASSED+=1
) || (
    echo [FAIL] Models Endpoint
    set /a TESTS_FAILED+=1
)

echo.
echo =============================================
echo Summary: %TESTS_PASSED% passed, %TESTS_FAILED% failed
echo.

if %TESTS_FAILED% equ 0 (
    echo All tests passed!
    echo.
    echo Next steps:
    echo 1. Open http://localhost:3000 in your browser
    echo 2. Sign up with an email and password
    echo 3. Create an agent
    echo 4. Test the chat interface
    exit /b 0
) else (
    echo Some tests failed. Troubleshooting:
    echo - Ensure Docker is running
    echo - Run: docker-compose up --build
    echo - Check .env file for correct DATABASE_URL and OPENROUTER_API_KEY
    echo - View logs: docker-compose logs -f
    exit /b 1
)
