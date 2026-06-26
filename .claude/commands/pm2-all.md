Start all services and open PM2 monitor.
```bash
cd "C:\Users\yngsw\dev\dify-knowledge-searcher" && pm2 start ecosystem.config.cjs && start wt.exe -d "C:\Users\yngsw\dev\dify-knowledge-searcher" pwsh -NoExit -c "pm2 monit"
```
