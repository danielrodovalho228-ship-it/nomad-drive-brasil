#!/usr/bin/env bash
# ====================================================================
# Nomade Drive Brasil — Aplicador automático de SQLs
# --------------------------------------------------------------------
# Lista todos os supabase-fase*.sql na pasta e aplica em ordem.
# Pula os que já foram aplicados (controla via tabela _migrations_local).
#
# REQUER:
#   - psql instalado (vem com PostgreSQL client)
#     macOS:  brew install postgresql
#     Linux:  sudo apt install postgresql-client
#     Windows: vem com Git Bash ou instala via choco
#   - DATABASE_URL exportada com a connection string do Supabase
#     (Project Settings > Database > Connection string > Direct connection)
#
# COMO USAR:
#   1. Pega a connection string em:
#      Supabase Dashboard → Settings → Database → Connection string
#      → "URI" → marca "Use connection pooler" se quiser
#
#   2. Export no terminal:
#      export DATABASE_URL="postgresql://postgres:[PWD]@db.zeexmbgacvsaciojcrwr.supabase.co:5432/postgres"
#
#   3. Roda:
#      bash apply-all-sql.sh
#
#   4. Vai listar o que vai aplicar e pedir confirmação.
# ====================================================================

set -euo pipefail

# Cores pra terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verifica DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}❌ DATABASE_URL não definida.${NC}"
  echo ""
  echo "Pega a connection string em:"
  echo "  Supabase Dashboard → Settings → Database → Connection string"
  echo ""
  echo "Export no terminal:"
  echo "  export DATABASE_URL=\"postgresql://postgres:[SUA-SENHA]@db.zeexmbgacvsaciojcrwr.supabase.co:5432/postgres\""
  echo ""
  exit 1
fi

# Verifica psql
if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ psql não encontrado. Instala o cliente PostgreSQL:${NC}"
  echo "  macOS:  brew install postgresql"
  echo "  Linux:  sudo apt install postgresql-client"
  echo "  Windows: choco install postgresql ou usa Git Bash"
  exit 1
fi

# Cria tabela de controle se não existir
echo -e "${BLUE}📋 Verificando tabela de controle...${NC}"
psql "$DATABASE_URL" -q -c "
create table if not exists public._migrations_local (
  filename text primary key,
  applied_at timestamptz not null default now(),
  hash text
);
" > /dev/null 2>&1

# Lista TODOS os SQLs na pasta (ordem alfabética = ordem cronológica das fases)
SQL_FILES=$(ls supabase-*.sql 2>/dev/null | sort -V || true)

if [ -z "$SQL_FILES" ]; then
  echo -e "${YELLOW}⚠️  Nenhum arquivo supabase-*.sql encontrado na pasta atual.${NC}"
  exit 0
fi

# Conta total
TOTAL=$(echo "$SQL_FILES" | wc -l | tr -d ' ')
echo -e "${BLUE}📦 Encontrei $TOTAL arquivos SQL${NC}"

# Mostra quais NÃO foram aplicados ainda
echo ""
echo -e "${BLUE}🔍 Checando quais já foram aplicados...${NC}"

PENDING_FILES=""
APPLIED_COUNT=0
PENDING_COUNT=0

for FILE in $SQL_FILES; do
  COUNT=$(psql "$DATABASE_URL" -q -t -A -c "select count(*) from public._migrations_local where filename = '$FILE';" 2>/dev/null || echo "0")
  if [ "$COUNT" = "0" ]; then
    PENDING_FILES="$PENDING_FILES $FILE"
    PENDING_COUNT=$((PENDING_COUNT + 1))
    echo -e "  ${YELLOW}⏳ $FILE${NC} (pendente)"
  else
    APPLIED_COUNT=$((APPLIED_COUNT + 1))
    # Comentado pra não poluir — descomenta se quiser ver os já aplicados
    # echo -e "  ${GREEN}✓ $FILE${NC} (já aplicado)"
  fi
done

echo ""
echo -e "${GREEN}✓ Já aplicados: $APPLIED_COUNT${NC}"
echo -e "${YELLOW}⏳ Pendentes: $PENDING_COUNT${NC}"
echo ""

if [ "$PENDING_COUNT" = "0" ]; then
  echo -e "${GREEN}🎉 Tudo já está no ar!${NC}"
  exit 0
fi

# Confirma
echo -e "${YELLOW}Vou aplicar os $PENDING_COUNT arquivos pendentes na ordem.${NC}"
read -p "Continuar? (s/N): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo "Cancelado."
  exit 0
fi

# Aplica
echo ""
APPLIED=0
FAILED=0
for FILE in $PENDING_FILES; do
  echo -e "${BLUE}🔧 Aplicando $FILE...${NC}"
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$FILE" > /tmp/sql_output.log 2>&1; then
    # Sucesso — registra
    psql "$DATABASE_URL" -q -c "insert into public._migrations_local (filename) values ('$FILE');" > /dev/null
    APPLIED=$((APPLIED + 1))
    echo -e "  ${GREEN}✓ Aplicado com sucesso${NC}"

    # Mostra notices (raise notice) do script se houver
    grep -E '^NOTICE|^WARNING' /tmp/sql_output.log | head -10 || true
  else
    FAILED=$((FAILED + 1))
    echo -e "  ${RED}❌ FALHOU${NC}"
    echo -e "${RED}--- Erro: ---${NC}"
    tail -20 /tmp/sql_output.log
    echo -e "${RED}--- Fim ---${NC}"
    echo ""
    read -p "Continuar com os próximos? (s/N): " cont
    if [[ "$cont" != "s" && "$cont" != "S" ]]; then
      break
    fi
  fi
  echo ""
done

echo ""
echo -e "${GREEN}=== RESUMO ===${NC}"
echo -e "  ${GREEN}✓ Aplicados: $APPLIED${NC}"
echo -e "  ${RED}❌ Falhas: $FAILED${NC}"
echo ""
echo "Pra ver histórico:"
echo "  psql \$DATABASE_URL -c 'select * from public._migrations_local order by applied_at desc;'"
