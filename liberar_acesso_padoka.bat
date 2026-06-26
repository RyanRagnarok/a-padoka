@echo off
echo ===================================================
echo Liberando acesso da rede ao servidor Padoka...
echo ===================================================
netsh advfirewall firewall add rule name="Padoka Backend" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="Padoka Frontend (Dev)" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Padoka Frontend (Docker)" dir=in action=allow protocol=TCP localport=80
echo.
echo Tudo certo! O Firewall do Windows agora permite que seu celular acesse o sistema.
echo Pode fechar esta janela.
pause

