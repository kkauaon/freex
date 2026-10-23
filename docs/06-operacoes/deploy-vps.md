# Deploy em uma VPS

**RASCUNHO.** Roteiro manual para a fase 1, com os três processos que existem hoje. **Pendência:** os arquivos de `deploy/` foram escritos e a leitura do endereço do cliente foi testada, mas o roteiro **ainda não foi executado numa VPS real**; revise a primeira instalação passo a passo. Não substitui a topologia alvo de [`deploy-e-observabilidade.md`](deploy-e-observabilidade.md), seção 4 (containers, PostgreSQL, Redis, CDN), que continua sendo o destino.

**Relaciona-se com:** [`../03-arquitetura/seguranca-e-privacidade.md`](../03-arquitetura/seguranca-e-privacidade.md) (5.3.1), [`../03-arquitetura/colaboracao-tempo-real.md`](../03-arquitetura/colaboracao-tempo-real.md) (seção 18)

---

## 1. O que roda

| Serviço | Porta | Função | Estado em disco |
|---|---|---|---|
| `apps/web` (Next.js) | 3000 | o site | nenhum |
| `apps/collab` | 3002 | colaboração (WebSocket) e `POST /v1/shares` | arquivos `.ydoc` em `COLLAB_DATA_DIR` |
| `apps/api` | 3001 | exportação de PDF (Chromium) | nenhum |

Os três escutam em `127.0.0.1`; só o Caddy (portas 80 e 443) fala com a internet. Cada um tem um subdomínio: `app.`, `collab.` e `api.`.

## 2. Preparar a máquina (Ubuntu)

```bash
# usuário sem login e pastas
sudo adduser --system --group --home /srv/freex freex
sudo mkdir -p /etc/freex /var/lib/freex/collab
sudo chown freex:freex /var/lib/freex/collab

# Node 24, pnpm (via corepack), git e Caddy: use os pacotes oficiais de cada um
sudo corepack enable

# firewall: só SSH e web
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

DNS: crie os registros `app`, `collab` e `api` apontando para o IP da VPS antes de iniciar o Caddy (ele pede o certificado no primeiro acesso).

## 3. Instalar

Na VPS:

```bash
sudo -u freex git clone <url-do-repositorio> /srv/freex
cd /srv/freex
sudo -u freex pnpm install --frozen-lockfile
# o PDF precisa do Chromium; instale como freex, que é quem vai executá-lo
sudo -u freex pnpm --filter @freex/pdf exec playwright install chromium
sudo pnpm --filter @freex/pdf exec playwright install-deps chromium   # bibliotecas do sistema
```

Configuração (copie e edite os domínios):

```bash
sudo cp deploy/env/collab.env.example /etc/freex/collab.env
sudo cp deploy/env/api.env.example    /etc/freex/api.env
sudo cp deploy/env/web.env.example    /etc/freex/web.env
sudo chown root:freex /etc/freex/*.env && sudo chmod 640 /etc/freex/*.env
```

Build do web com as URLs públicas (as `NEXT_PUBLIC_*` ficam **fixadas no build**; mudou o domínio, rode o build de novo):

```bash
sudo -u freex bash -c 'set -a; . /etc/freex/web.env; set +a; pnpm --filter @freex/web build'
```

Serviços e proxy:

```bash
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now freex-collab freex-api freex-web

sudo cp deploy/Caddyfile /etc/caddy/Caddyfile      # troque example.com pelo seu domínio
sudo systemctl reload caddy
```

## 4. Conferir

- `curl https://collab.seudominio.com/health` responde `{"status":"ok"}`.
- `https://app.seudominio.com` abre a lista de recentes; abra o rascunho, clique em **Compartilhar** e abra o link em outro navegador: os dois devem editar juntos.
- Exporte um PDF: se falhar, veja `journalctl -u freex-api`; o motivo mais comum é biblioteca do Chromium faltando.
- `journalctl -u freex-collab -f` mostra `share.created` ao compartilhar. Os logs não trazem texto de roteiro, nome nem token.

## 5. Variáveis

| Variável | Onde | Efeito |
|---|---|---|
| `WEB_ORIGIN` | collab, api | origem exata do site; qualquer outra é recusada (CORS e `Origin` do WebSocket) |
| `HOST` | collab, api | `127.0.0.1` atrás do Caddy |
| `COLLAB_DATA_DIR` | collab | onde ficam os roteiros compartilhados |
| `TRUST_PROXY` | collab | `true` atrás do Caddy local: os limites por endereço passam a contar o cliente real (`X-Forwarded-For`, último valor, só se a conexão vier de loopback). Sem isso, todas as pessoas parecem ser `127.0.0.1` e dividem o limite de 10 links/min e 60 conexões. **Não ligue** se o collab estiver exposto direto à internet |
| `NEXT_PUBLIC_COLLAB_URL`, `NEXT_PUBLIC_API_URL` | build do web | endereços que o navegador usa |

## 6. Atualizar

Como `freex`, em `/srv/freex`: `deploy/update.sh` (pull, install, build do web, restart). O usuário precisa poder rodar `systemctl restart freex-*` por `sudo` sem senha (`/etc/sudoers.d/freex`), ou rode o último comando à mão.

## 7. Backup

Os roteiros compartilhados **só existem** em `COLLAB_DATA_DIR`; os rascunhos locais ficam nos navegadores. Sem backup, perder a VPS é perder os roteiros compartilhados. Exemplo mínimo, diário, para outro lugar (outro servidor ou armazenamento de objetos):

```bash
# /etc/cron.d/freex-backup
0 3 * * * freex rsync -a --delete /var/lib/freex/collab/ backup@outro-host:/backups/freex/collab/
```

Restaurar é copiar os arquivos de volta e reiniciar o `freex-collab`. Teste a restauração uma vez.

## 8. Limites conhecidos

- Um único processo de colaboração: não há réplica nem Redis (seção 18 de `colaboracao-tempo-real.md`).
- Não há revogação nem validade dos links, e o armazenamento em arquivos é provisório (PostgreSQL planejado).
- Não há monitoramento, alertas, CI nem rollback automatizado; `journalctl` e o `curl /health` são tudo.
- A API de PDF é síncrona e sem autenticação (atalho da fase 1): limite o acesso a ela se o PDF for abusado.
