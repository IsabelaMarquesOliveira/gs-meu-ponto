import * as Location from 'expo-location';

// 1) Pede permissão para usar o GPS. Retorna true se a usuária aceitar.
export async function pedirPermissaoGPS() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// 2) Pega a posição atual do celular (latitude e longitude)
export async function pegarMinhaPosicao() {
  const posicao = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: posicao.coords.latitude,
    longitude: posicao.coords.longitude,
  };
}

// 3) Calcula a distância em metros entre dois pontos do mapa (fórmula de Haversine)
export function distanciaEmMetros(lat1, lon1, lat2, lon2) {
  const raioDaTerra = 6371000; // em metros
  const paraRadianos = (graus) => (graus * Math.PI) / 180;

  const dLat = paraRadianos(lat2 - lat1);
  const dLon = paraRadianos(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRadianos(lat1)) * Math.cos(paraRadianos(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * raioDaTerra * Math.asin(Math.sqrt(a));
}

// 4) Recebe a lista de pontos da API e devolve o mais perto da usuária
//    Na API, cada ponto tem: cp (código), np (nome), py (latitude), px (longitude)
export function encontrarPontoMaisProximo(minhaPosicao, paradas) {
  let maisProximo = null;
  let menorDistancia = Infinity;

  for (const parada of paradas) {
    const distancia = distanciaEmMetros(
      minhaPosicao.latitude,
      minhaPosicao.longitude,
      parada.py,
      parada.px
    );
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      maisProximo = parada;
    }
  }

  return { parada: maisProximo, distancia: Math.round(menorDistancia) };
}