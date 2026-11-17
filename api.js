import { TOKEN } from './config';

const BASE_URL = 'https://api.olhovivo.sptrans.com.br/v2.1';

// 1) Login: a API responde true e guarda um cookie de sessão
export async function autenticar() {
  const resposta = await fetch(`${BASE_URL}/Login/Autenticar?token=${TOKEN}`, {
    method: 'POST',
    credentials: 'include',
  });
  const ok = await resposta.json();
  return ok === true;
}

// Função auxiliar para fazer os GETs
async function get(caminho) {
  const resposta = await fetch(`${BASE_URL}${caminho}`, { credentials: 'include' });
  return resposta.json();
}

// 2) Busca linhas pelo número ou nome (ex.: "8000" ou "Lapa")
export function buscarLinhas(termo) {
  return get(`/Linha/Buscar?termosBusca=${encodeURIComponent(termo)}`);
}

// 3) Todos os pontos de uma linha (com latitude e longitude)
export function buscarParadasDaLinha(codigoLinha) {
  return get(`/Parada/BuscarParadasPorLinha?codigoLinha=${codigoLinha}`);
}

// 4) Previsão de chegada de uma linha em um ponto
export function buscarPrevisao(codigoParada, codigoLinha) {
  return get(`/Previsao?codigoParada=${codigoParada}&codigoLinha=${codigoLinha}`);
}

// 5) Previsão da linha em todos os pontos (usado quando a busca de pontos vem vazia)
export function buscarPrevisaoDaLinha(codigoLinha) {
  return get(`/Previsao/Linha?codigoLinha=${codigoLinha}`);
}