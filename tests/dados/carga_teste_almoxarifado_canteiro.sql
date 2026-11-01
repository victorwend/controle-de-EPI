-- =============================================================
-- CARGA DE TESTE — EPIs no "Almoxarifado Canteiro" (EPI-343)
--
-- O QUE FAZ: cadastra 15 EPIs de teste e dá ENTRADA de estoque deles
-- no local "Almoxarifado Canteiro" (para testar entrega, entrega em lote,
-- troca e devolução).
--
-- ATENÇÃO:
--  - Isto NÃO é uma correção do banco (não muda tabelas). São DADOS de
--    teste, por isso fica em tests/dados e não em supabase/.
--  - Os CAs começam com "TESTE-" para ficar fácil de reconhecer.
--  - Os EPIs são cadastrados uma vez só. Rodar o script de novo NÃO
--    duplica EPIs, mas SOMA mais uma entrada de estoque.
--  - A entrada é feita pela função registrar_entrada_estoque (a mesma da
--    tela), em nome do Administrador da empresa: fica registrada no
--    histórico de movimentações como "Carga de teste".
--
-- COMO RODAR: Supabase → SQL Editor → cole tudo → Run.
-- Resultado esperado: uma tabela com os 15 EPIs e o saldo de cada um.
-- =============================================================
do $$
declare
  v_local   uuid;
  v_empresa uuid;
  v_admin   uuid;
  v_epi     uuid;
  v_qtd_loc integer;
  r         record;
begin
  select count(*) into v_qtd_loc
    from locais_estoque where lower(btrim(nome)) = 'almoxarifado canteiro';

  if v_qtd_loc = 0 then
    raise exception 'Local "Almoxarifado Canteiro" não encontrado. Locais existentes: %. Cadastre o local em Estoque → Locais ou ajuste o nome.',
      coalesce((select string_agg(nome, ', ' order by nome) from locais_estoque), 'nenhum');
  end if;
  if v_qtd_loc > 1 then
    raise exception 'Há % locais chamados "Almoxarifado Canteiro". Deixe só um ativo com esse nome.', v_qtd_loc;
  end if;

  select id, empresa_id into v_local, v_empresa
    from locais_estoque where lower(btrim(nome)) = 'almoxarifado canteiro';

  select id into v_admin
    from usuarios
   where empresa_id = v_empresa and perfil = 'administrador' and status = 'ativo'
   order by created_at
   limit 1;
  if v_admin is null then
    raise exception 'Nenhum Administrador ativo na empresa do local.';
  end if;

  -- Faz as funções acharem "quem está logado" (o Administrador).
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  for r in
    select * from (values
      ('Capacete de segurança aba frontal classe B', 'Proteção da cabeça',   'TESTE-0001', 'Fabricante Teste', 40),
      ('Jugular para capacete',                      'Proteção da cabeça',   'TESTE-0002', 'Fabricante Teste', 40),
      ('Óculos de proteção incolor',                 'Proteção dos olhos',   'TESTE-0003', 'Fabricante Teste', 60),
      ('Protetor facial incolor',                    'Proteção dos olhos',   'TESTE-0004', 'Fabricante Teste', 15),
      ('Protetor auricular tipo plug',               'Proteção auditiva',    'TESTE-0005', 'Fabricante Teste', 200),
      ('Protetor auricular tipo concha',             'Proteção auditiva',    'TESTE-0006', 'Fabricante Teste', 20),
      ('Máscara PFF2 sem válvula',                   'Proteção respiratória','TESTE-0007', 'Fabricante Teste', 150),
      ('Luva de vaqueta',                            'Proteção das mãos',    'TESTE-0008', 'Fabricante Teste', 80),
      ('Luva nitrílica',                             'Proteção das mãos',    'TESTE-0009', 'Fabricante Teste', 80),
      ('Bota de segurança com bico de PVC',          'Proteção dos pés',     'TESTE-0010', 'Fabricante Teste', 30),
      ('Botina de couro com elástico',               'Proteção dos pés',     'TESTE-0011', 'Fabricante Teste', 30),
      ('Cinto de segurança tipo paraquedista',       'Proteção contra queda','TESTE-0012', 'Fabricante Teste', 12),
      ('Talabarte duplo em Y com absorvedor',        'Proteção contra queda','TESTE-0013', 'Fabricante Teste', 12),
      ('Colete refletivo',                           'Vestimenta',           'TESTE-0014', 'Fabricante Teste', 50),
      ('Perneira de segurança',                      'Proteção das pernas',  'TESTE-0015', 'Fabricante Teste', 25)
    ) as t(nome, categoria, ca, fabricante, quantidade)
  loop
    select id into v_epi from epis where empresa_id = v_empresa and ca = r.ca;
    if v_epi is null then
      insert into epis (empresa_id, nome, categoria, ca, fabricante, validade_ca, estoque_minimo)
      values (v_empresa, r.nome, r.categoria, r.ca, r.fabricante, current_date + 730, 5)
      returning id into v_epi;
    end if;

    perform registrar_entrada_estoque(v_epi, v_local, r.quantidade,
      'CARGA-TESTE', 'Carga de teste', 'Dados de teste (EPI-343)');
  end loop;

  raise notice 'Carga de teste concluída no local %.', v_local;
end;
$$;

-- Conferência: saldo de cada EPI de teste no Almoxarifado Canteiro.
select e.nome as epi, e.ca, s.saldo
  from saldo_estoque s
  join epis e on e.id = s.epi_id
  join locais_estoque l on l.id = s.local_id
 where lower(btrim(l.nome)) = 'almoxarifado canteiro'
   and e.ca like 'TESTE-%'
 order by e.ca;
