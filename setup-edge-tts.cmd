@echo off
setlocal
pushd "%~dp0" || exit /b 1
if exist ".venv-edge\Scripts\python.exe" goto install
where py.exe >nul 2>&1
if errorlevel 1 goto pythonfallback
py -3 -m venv .venv-edge
if errorlevel 1 goto failed
goto install
:pythonfallback
where python.exe >nul 2>&1
if errorlevel 1 goto failed
python.exe -m venv .venv-edge
if errorlevel 1 goto failed
:install
".venv-edge\Scripts\python.exe" -m pip install -r requirements-edge.txt --disable-pip-version-check
if errorlevel 1 goto failed
".venv-edge\Scripts\python.exe" -c "import edge_tts; print('Edge speech is ready.')"
if errorlevel 1 goto failed
popd
exit /b 0
:failed
echo Edge speech setup failed. Install Python 3.10 or newer and check your network.
pause
popd
exit /b 1