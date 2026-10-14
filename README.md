# Smart NFC Manager

PROJETO NFC CONTROL — SISTEMA WEB DE GESTÃO DE PLAQUINHAS NFC E QR CODES DINÂMICOS



Desenvolva um sistema web profissional, moderno, responsivo e funcional para administrar um negócio de plaquinhas NFC com QR Codes dinâmicos.



O sistema deverá funcionar por um link no navegador, tanto no computador quanto no celular, sem exigir instalação de aplicativo.



Não quero apenas uma demonstração visual. Quero uma aplicação funcional, conectada a um banco de dados real, com autenticação, estoque persistente, vendas, financeiro, histórico e gerenciamento de redirecionamentos.



Utilize Lovable para desenvolver a interface e Supabase para banco de dados, autenticação e operações seguras.



1. Identidade visual



Crie uma interface premium inspirada em sistemas SaaS profissionais.



- Paleta de cores: preto, branco, bege e dourado discreto.

- Menu lateral elegante no computador.

- Navegação adaptada para dispositivos móveis.

- Cards com cantos arredondados e sombras sutis.

- Tipografia moderna e legível.

- Ícones minimalistas.

- Gráficos financeiros limpos.

- Tabelas organizadas com filtros e pesquisa.

- Idioma português brasileiro.

- Valores em reais.

- Datas no formato DD/MM/AAAA.



Nome provisório do sistema: NFC Control.



2. Menu principal



Crie as seguintes abas:



1. Início — Dashboard.

2. Estoque.

3. Plaquinhas.

4. QR Codes.

5. Vendas.

6. Clientes.

7. Financeiro.

8. Revendedores.

9. Relatórios.

10. Configurações.



Todas as telas devem compartilhar o mesmo banco de dados e refletir as alterações realizadas nas outras áreas.



3. Dashboard



O painel inicial deve apresentar:



- Total de plaquinhas cadastradas.

- Quantidade disponível.

- Quantidade vendida.

- Quantidade reservada.

- Quantidade atribuída a revendedores.

- Quantidade defeituosa ou perdida.

- Faturamento total.

- Valor efetivamente recebido.

- Valores pendentes.

- Despesas.

- Lucro estimado.



Inclua gráfico de faturamento por período, últimas movimentações e alerta de estoque baixo.



Todos os indicadores devem ser calculados a partir dos dados reais do banco, sem números fictícios após a implantação.



4. Estoque com entrada por quantidade e numeração automática



Esta é a regra central do sistema e deve ser implementada exatamente como descrita.



Quero cadastrar a quantidade recebida, e o sistema deverá criar automaticamente as identificações individuais das plaquinhas em sequência.



Não quero preencher manualmente a descrição de cada unidade.



Exemplo obrigatório



Imagine que eu tenha 50 plaquinhas cadastradas.



Na tela Estoque, clico em “Adicionar entrada” e informo que recebi mais 15 unidades.



O sistema deverá:



- Identificar que o maior código já utilizado é NFC 050.

- Criar automaticamente 15 novas plaquinhas.

- Gerar os códigos NFC 051 até NFC 065.

- Acrescentar as 15 unidades ao estoque.

- Atualizar o estoque total de 50 para 65.

- Registrar a data da entrada.

- Registrar a quantidade adicionada.

- Guardar o histórico da movimentação.



O usuário deve informar apenas a quantidade recebida. A numeração será gerada automaticamente pelo sistema.



Formato dos códigos



Utilize o padrão:



- NFC 001

- NFC 002

- NFC 003

- NFC 004

- NFC 005



Continue a sequência indefinidamente, utilizando três dígitos no início e aumentando a quantidade de dígitos quando necessário, sem reiniciar a numeração.



Regras essenciais da numeração



- Cada plaquinha física deve possuir um código individual único.

- Nunca duplicar códigos.

- Nunca reutilizar um código de uma plaquinha vendida, perdida, defeituosa ou excluída logicamente.

- A sequência deve considerar o maior número já utilizado, e não somente a quantidade disponível no estoque.

- Vendas e baixas não devem reiniciar nem diminuir a sequência.

- A numeração deve ser gerada no servidor ou no banco de dados de forma segura, inclusive quando duas entradas forem registradas simultaneamente.

- Não gerar códigos somente no navegador.

- Se uma operação falhar, não deixar plaquinhas parcialmente cadastradas nem alterar o saldo incorretamente.



Exemplo com venda anterior



Se existem 50 plaquinhas cadastradas e 10 já foram vendidas, ainda existem 50 identificações utilizadas historicamente.



Se eu receber mais 15 unidades, a numeração deverá continuar de NFC 051 até NFC 065, e não começar a partir da quantidade disponível.



O estoque disponível será calculado com base nas unidades cadastradas e em suas situações.



Formulário de entrada



Crie um formulário simples contendo:



- Quantidade recebida.

- Modelo da plaquinha.

- Data de recebimento.

- Fornecedor opcional.

- Custo unitário opcional.

- Observações opcionais.



Ao confirmar, mostrar uma prévia:



“Você está adicionando 15 plaquinhas.”



“Numeração a ser gerada: NFC 051 até NFC 065.”



“Estoque anterior: 50 unidades.”



“Estoque após a entrada: 65 unidades.”



Inclua um botão “Confirmar entrada”.



Após a confirmação, mostrar uma mensagem de sucesso e atualizar os números do painel.



Não registrar nenhuma entrada antes da confirmação do usuário.



5. Histórico de entradas



Cada recebimento deve gerar um registro próprio com:



- Data e horário.

- Quantidade recebida.

- Primeiro código gerado.

- Último código gerado.

- Modelo.

- Fornecedor.

- Custo unitário, quando informado.

- Custo total.

- Usuário responsável.



Exemplo:



Entrada #001 — 50 plaquinhas — NFC 001 até NFC 050.



Entrada #002 — 15 plaquinhas — NFC 051 até NFC 065.



As entradas anteriores devem continuar disponíveis para consulta.



Não sobrescrever o histórico quando uma nova entrada for registrada.



6. Cadastro individual das plaquinhas



Cada plaquinha deverá possuir um registro individual no banco de dados, contendo:



- Código NFC.

- Modelo.

- Data de entrada.

- Situação atual.

- Endereço permanente do QR Code.

- Destino atual do QR Code.

- Cliente vinculado, quando vendido.

- Data da venda.

- Valor da venda.

- Situação do pagamento.

- Revendedor responsável, quando aplicável.



A tela Plaquinhas deverá apresentar uma tabela com pesquisa pelo código NFC, filtros de status, modelo, data e cliente.



Ao clicar em uma plaquinha, abrir uma página de detalhes com todos os dados e o histórico da unidade.



7. Status e baixas



Cada unidade poderá ter uma das seguintes situações:



- Disponível.

- Reservada.

- Vendida.

- Atribuída a revendedor.

- Defeituosa.

- Perdida.



Implemente ações para venda, reserva, cancelamento de reserva, atribuição a revendedor, devolução autorizada e baixa por defeito ou perda.



Cada movimentação deverá registrar a situação anterior, a situação nova, a data, o responsável e o motivo.



Uma unidade vendida não poderá continuar disponível para venda.



A atribuição a um revendedor não deve ser contabilizada como venda nem como receita.



As correções devem preservar o histórico e exigir autorização quando necessário.



8. QR Codes dinâmicos



Cada plaquinha deve ter um endereço permanente próprio, como:



https://seudominio.com/q/NFC-001



O QR Code impresso deve armazenar esse endereço permanente, e não o endereço final do cliente.



Quando o endereço permanente for acessado, o servidor deverá consultar o banco de dados e redirecionar para o destino atualmente cadastrado.



Exemplo



Código da plaquinha: NFC 001.



Endereço permanente:



https://seudominio.com/q/NFC-001



Destino atual:



https://instagram.com/cliente



Se o cliente trocar de Instagram para WhatsApp, basta atualizar o destino no painel.



O endereço permanente continua igual, e o QR Code impresso não precisa ser substituído.



Tela de gerenciamento



Crie uma aba QR Codes contendo:



- Código NFC.

- Endereço permanente.

- Destino atual.

- Status ativo ou bloqueado.

- Data da última alteração.

- Botão editar destino.

- Botão copiar endereço.

- Botão visualizar QR Code.

- Botão baixar QR Code em PNG.

- Botão bloquear ou desbloquear.

- Histórico de alterações.



Valide os endereços e aceite somente destinos HTTP ou HTTPS válidos.



Não permita esquemas perigosos ou redirecionamentos para endereços não cadastrados.



Quando bloqueado, o QR Code deverá exibir uma página de indisponibilidade, sem redirecionar para o destino anterior.



Não exponha dados de clientes, vendas, custos ou informações administrativas no endpoint público.



9. Compatibilidade com NFC



O endereço gravado no chip NFC e o endereço contido no QR Code devem ser o mesmo endereço permanente da plaquinha, quando ambos forem configurados dessa maneira.



Assim, a aproximação do celular e a leitura do QR Code direcionarão para o mesmo endereço, que poderá ser alterado pelo sistema.



A atualização do destino no servidor não deverá exigir nova gravação do chip nem a impressão de outro QR Code.



Deixe claro na interface que o chip NFC precisa ter sido previamente gravado com o endereço permanente do sistema.



10. Vendas



Crie uma aba de vendas com:



- Cliente.

- Telefone opcional.

- Data.

- Plaquinhas vendidas.

- Código NFC de cada unidade.

- Quantidade.

- Preço unitário.

- Desconto.

- Valor total.

- Forma de pagamento.

- Status do pagamento.

- Revendedor responsável.

- Observações.



Ao confirmar uma venda, vincular as unidades ao cliente e atualizar o estoque disponível automaticamente.



Impedir que uma plaquinha seja vendida duas vezes.



Permitir pagamentos pendentes, parciais e pagos.



Se uma venda for cancelada, preservar seu histórico e registrar as movimentações de correção correspondentes.



11. Clientes



Crie um cadastro de clientes com nome, telefone, e-mail opcional, data de cadastro, vendas e plaquinhas vinculadas.



A página do cliente deve permitir visualizar quais plaquinhas ele possui e seus respectivos endereços permanentes e destinos atuais, respeitando as permissões de acesso.



12. Financeiro



Crie uma área financeira com:



- Faturamento bruto.

- Descontos.

- Valor recebido.

- Valores pendentes.

- Despesas.

- Custo das plaquinhas vendidas.

- Lucro estimado.



Inclua gráficos de recebimentos, despesas e evolução das vendas.



Cada venda deverá gerar os registros financeiros correspondentes, sem contabilizar valores pendentes como dinheiro recebido.



Permita registrar despesas operacionais e consultar o histórico financeiro.



13. Revendedores



Prepare um módulo opcional de revendedores.



O administrador poderá criar usuários e atribuir plaquinhas específicas a eles.



O sistema deverá mostrar a quantidade atribuída, as vendas realizadas e os valores pendentes de cada revendedor.



A atribuição de unidades não é uma venda.



Os revendedores somente poderão consultar e registrar operações autorizadas para as próprias unidades, sem acesso aos dados particulares dos demais revendedores.



14. Relatórios



Crie relatórios de:



- Estoque atual.

- Entradas por período.

- Sequência de códigos NFC.

- Vendas.

- Clientes.

- QR Codes.

- Movimentações.

- Despesas e recebimentos.



Permita exportar os relatórios para CSV.



Inclua filtros por período, modelo, código NFC, cliente e status.



15. Banco de dados e segurança



Utilize Supabase com PostgreSQL e Supabase Auth.



Crie uma estrutura relacional para:



- Usuários e permissões.

- Modelos de plaquinhas.

- Entradas de estoque.

- Plaquinhas individuais.

- Movimentações.

- Clientes.

- Vendas e itens vendidos.

- Pagamentos.

- Despesas.

- Revendedores e atribuições.

- Destinos e histórico dos QR Codes.



Implemente chaves estrangeiras, índices, restrições de unicidade e políticas RLS.



A geração de códigos, as entradas, as baixas, as reservas, as vendas e as atribuições devem utilizar operações seguras e consistentes no banco de dados.



Não exponha credenciais privilegiadas no navegador.



O sistema deve validar as permissões no servidor e no banco, não apenas na interface.



Preserve os históricos e evite exclusões definitivas de registros financeiros ou de movimentações.



16. Experiência de uso



Quero executar as operações principais em poucos cliques.



Para adicionar plaquinhas, o processo deve ser:



1. Abrir Estoque.

2. Clicar em Adicionar entrada.

3. Digitar a quantidade recebida.

4. Conferir a sequência de códigos que será gerada.

5. Confirmar a entrada.



Todo o restante deverá ser automático.



Para vender:



1. Abrir Vendas.

2. Selecionar o cliente.

3. Selecionar a plaquinha disponível.

4. Informar o preço e o pagamento.

5. Confirmar a venda.



Para alterar um QR Code:



1. Pesquisar pelo código NFC.

2. Abrir o QR Code.

3. Alterar o destino.

4. Salvar.

5. Confirmar que o mesmo endereço permanente passou a redirecionar para o novo destino.



17. Testes obrigatórios



Antes de considerar o sistema concluído, valide:



1. Cadastrar 50 unidades e gerar NFC 001 até NFC 050.

2. Adicionar 15 unidades e gerar NFC 051 até NFC 065.

3. Confirmar que o estoque total passou de 50 para 65.

4. Vender 10 unidades e confirmar que o estoque disponível passou a 55.

5. Adicionar mais unidades e confirmar que a sequência continua a partir do maior código já utilizado.

6. Confirmar que códigos vendidos, perdidos ou defeituosos nunca são reutilizados.

7. Confirmar que todas as unidades possuem registros individuais.

8. Alterar o destino de um QR Code e testar o redirecionamento real.

9. Bloquear um QR Code e confirmar que o destino antigo não é utilizado.

10. Sair e entrar novamente e confirmar que os dados persistem.

11. Verificar as permissões de administrador e revendedor.

12. Confirmar que falhas não deixam entradas ou vendas parcialmente registradas.



Não apresente simulações como se fossem operações reais. Caso o banco de dados ou uma configuração esteja faltando, informe claramente o que ainda precisa ser configurado.



18. Ordem de desenvolvimento



Desenvolva nesta ordem:



1. Interface e navegação.

2. Banco de dados e autenticação.

3. Entrada de estoque com geração sequencial dos códigos NFC.

4. Listagem individual e movimentações.

5. Baixa de estoque e vendas.

6. QR Codes dinâmicos e redirecionamento.

7. Financeiro.

8. Clientes e revendedores.

9. Relatórios e testes finais.



Resultado esperado: um site comercial profissional e funcional, acessível por link, no qual eu informo a quantidade de plaquinhas recebidas e o sistema acrescenta automaticamente as unidades ao estoque, gera os códigos NFC sequenciais sem duplicação e permite controlar vendas, clientes, financeiro e QR Codes dinâmicos em um único painel.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1d6e533f-15ed-4791-9bf6-ed6db46d1044).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
