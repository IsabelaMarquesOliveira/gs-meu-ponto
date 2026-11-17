import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Vibration, StyleSheet,
} from 'react-native';
import { autenticar, buscarLinhas, buscarParadasDaLinha, buscarPrevisao, buscarPrevisaoDaLinha } from './api';
import { pedirPermissaoGPS, pegarMinhaPosicao, encontrarPontoMaisProximo } from './localizacao';
import { pedirPermissaoNotificacao, enviarNotificacao } from './notificacoes';

const MINUTOS_PARA_AVISAR = 5;          // avisa quando faltar 5 min ou menos
const INTERVALO_VERIFICACAO = 30000;    // consulta a API a cada 30 segundos

// Calcula quantos minutos faltam entre a hora da consulta e a hora prevista (formato "HH:MM")
function minutosAte(horaAtual, horaPrevista) {
  const [h1, m1] = horaAtual.split(':').map(Number);
  const [h2, m2] = horaPrevista.split(':').map(Number);
  let diferenca = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diferenca < 0) diferenca += 24 * 60; // caso passe da meia-noite
  return diferenca;
}

export default function App() {
  const [busca, setBusca] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [linhaEscolhida, setLinhaEscolhida] = useState(null);
  const [ponto, setPonto] = useState(null);     // { parada, distancia }
  const [onibus, setOnibus] = useState([]);     // próximos ônibus no ponto
  const [carregando, setCarregando] = useState(false);
  const [monitorando, setMonitorando] = useState(false);
  const timerRef = useRef(null);                // guarda o "relógio" que repete a verificação

  // Se o app for fechado, para o relógio
  useEffect(() => {
    return () => pararAviso();
  }, []);

  // 1) Busca as linhas pelo número ou nome digitado
  async function pesquisarLinhas() {
    if (busca.trim() === '') {
      Alert.alert('Atenção', 'Digite o número ou o nome de uma linha.');
      return;
    }
    setCarregando(true);
    try {
      const logou = await autenticar();
      if (!logou) {
        Alert.alert('Erro de acesso', 'Não foi possível conectar à API da SPTrans.');
        return;
      }
      const resultado = await buscarLinhas(busca);
      setLinhas(resultado);
      setLinhaEscolhida(null);
      if (resultado.length === 0) {
        Alert.alert('Nenhuma linha encontrada', 'Tente outro número ou nome.');
      }
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível buscar as linhas. Verifique sua internet.');
    } finally {
      setCarregando(false);
    }
  }

  // 2) Ao escolher uma linha: usa o GPS para achar o ponto mais próximo
  async function escolherLinha(linha) {
    setCarregando(true);
    try {
      const permitiu = await pedirPermissaoGPS();
      if (!permitiu) {
        Alert.alert('GPS necessário', 'Ative a localização para encontrarmos o ponto mais próximo de você.');
        return;
      }
      const minhaPosicao = await pegarMinhaPosicao();

      // Tenta buscar os pontos da linha. Se vier vazio, usa o plano B (previsão da linha)
      let paradas = await buscarParadasDaLinha(linha.cl);
      if (!Array.isArray(paradas) || paradas.length === 0) {
        const previsaoLinha = await buscarPrevisaoDaLinha(linha.cl);
        paradas = previsaoLinha.ps || [];
      }
      if (paradas.length === 0) {
        Alert.alert('Ops', 'Não encontramos pontos para essa linha. Talvez não haja ônibus circulando agora.');
        return;
      }

      const maisProximo = encontrarPontoMaisProximo(minhaPosicao, paradas);
      setLinhaEscolhida(linha);
      setPonto(maisProximo);
      await carregarPrevisao(maisProximo.parada, linha);
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível carregar os dados da linha.');
    } finally {
      setCarregando(false);
    }
  }

  // 3) Busca a previsão de chegada dos ônibus naquele ponto
  async function carregarPrevisao(parada, linha) {
    const previsao = await buscarPrevisao(parada.cp, linha.cl);
    if (!previsao.p || previsao.p.l.length === 0) {
      setOnibus([]);
      return [];
    }
    const veiculos = previsao.p.l[0].vs.map((v) => ({
      prefixo: v.p,
      hora: v.t,
      minutos: minutosAte(previsao.hr, v.t),
      acessivel: v.a,
    }));
    setOnibus(veiculos);
    return veiculos;
  }

  // Botão "Atualizar"
  async function atualizar() {
    setCarregando(true);
    try {
      await autenticar();
      await carregarPrevisao(ponto.parada, linhaEscolhida);
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível atualizar a previsão.');
    } finally {
      setCarregando(false);
    }
  }

  // 4) Verifica se algum ônibus está a 5 min ou menos. Se estiver, avisa!
  async function verificarChegada() {
    try {
      await autenticar();
      const veiculos = await carregarPrevisao(ponto.parada, linhaEscolhida);
      const proximo = veiculos.find((v) => v.minutos <= MINUTOS_PARA_AVISAR);

      if (proximo) {
        pararAviso();
        Vibration.vibrate([0, 500, 300, 500, 300, 500]); // vibra 3 vezes
        const letreiro = `${linhaEscolhida.lt}-${linhaEscolhida.tl}`;
        await enviarNotificacao(
          '🚌 Seu ônibus está chegando!',
          `A linha ${letreiro} chega em ${proximo.minutos} min no ponto ${ponto.parada.np}.`
        );
        Alert.alert('🚌 Hora de ir para o ponto!', `O ônibus chega em ${proximo.minutos} minutos.`);
      }
    } catch (erro) {
      // Se falhar uma vez (internet oscilou), tenta de novo na próxima verificação
    }
  }

  // Botão "Me avise"
  async function ativarAviso() {
    const permitiu = await pedirPermissaoNotificacao();
    if (!permitiu) {
      Alert.alert('Notificações desativadas', 'Ative as notificações nas configurações do celular para receber o aviso.');
      return;
    }
    setMonitorando(true);
    Alert.alert('Aviso ativado 🔔', `Vamos avisar quando faltar ${MINUTOS_PARA_AVISAR} minutos ou menos. Deixe o app aberto.`);
    timerRef.current = setInterval(verificarChegada, INTERVALO_VERIFICACAO);
    verificarChegada(); // já verifica uma vez na hora
  }

  // Para de verificar
  function pararAviso() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setMonitorando(false);
  }

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.titulo}>🚏 Meu Ponto</Text>
        <Text style={styles.subtitulo}>Saiba quando seu ônibus chega no ponto mais perto de você</Text>

        {/* Campo de busca */}
        <View style={styles.linhaBusca}>
          <TextInput
            style={styles.input}
            placeholder="Linha (ex.: 8000 ou Lapa)"
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={pesquisarLinhas}
          />
          <TouchableOpacity style={styles.botao} onPress={pesquisarLinhas}>
            <Text style={styles.textoBotao}>Buscar</Text>
          </TouchableOpacity>
        </View>

        {carregando && <ActivityIndicator size="large" color="#2E7D32" style={{ marginVertical: 20 }} />}

        {/* Lista de linhas encontradas */}
        {!linhaEscolhida && linhas.map((linha) => (
          <TouchableOpacity key={linha.cl} style={styles.card} onPress={() => escolherLinha(linha)}>
            <Text style={styles.letreiro}>{linha.lt}-{linha.tl}</Text>
            <Text>Sentido: {linha.sl === 1 ? linha.ts : linha.tp}</Text>
          </TouchableOpacity>
        ))}

        {/* Detalhes da linha escolhida */}
        {linhaEscolhida && ponto && (
          <View>
            <View style={styles.card}>
              <Text style={styles.letreiro}>
                {linhaEscolhida.lt}-{linhaEscolhida.tl} → {linhaEscolhida.sl === 1 ? linhaEscolhida.ts : linhaEscolhida.tp}
              </Text>
              <Text style={styles.rotulo}>📍 Ponto mais próximo de você:</Text>
              <Text style={styles.destaque}>{ponto.parada.np}</Text>
              {ponto.parada.ed ? <Text>{ponto.parada.ed}</Text> : null}
              <Text>a {ponto.distancia} metros</Text>
            </View>

            {/* Botão de aviso */}
            {monitorando ? (
              <TouchableOpacity style={[styles.botao, styles.botaoCancelar]} onPress={pararAviso}>
                <Text style={styles.textoBotao}>🔕 Cancelar aviso</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.botao, styles.botaoAviso]} onPress={ativarAviso}>
                <Text style={styles.textoBotao}>🔔 Me avise quando faltar {MINUTOS_PARA_AVISAR} min</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.secao}>Próximos ônibus</Text>
            {onibus.length === 0 && <Text>Nenhum ônibus previsto no momento.</Text>}
            {onibus.map((o) => (
              <View key={o.prefixo} style={styles.card}>
                <Text style={styles.destaque}>🚌 em {o.minutos} min ({o.hora})</Text>
                <Text>Veículo {o.prefixo} {o.acessivel ? '• ♿ Acessível' : ''}</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.botao} onPress={atualizar}>
              <Text style={styles.textoBotao}>🔄 Atualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botaoSecundario}
              onPress={() => { pararAviso(); setLinhaEscolhida(null); }}
            >
              <Text>← Escolher outra linha</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Crédito obrigatório */}
      <Text style={styles.rodape}>Dados: SPTrans - API Olho Vivo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 50 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32' },
  subtitulo: { fontSize: 15, color: '#555', marginBottom: 16 },
  linhaBusca: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 12, fontSize: 16 },
  botao: { backgroundColor: '#2E7D32', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  botaoAviso: { backgroundColor: '#F57C00', marginBottom: 8 },
  botaoCancelar: { backgroundColor: '#C62828', marginBottom: 8 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  botaoSecundario: { padding: 14, alignItems: 'center' },
  card: { backgroundColor: '#FFF', padding: 14, borderRadius: 8, marginBottom: 10, elevation: 2 },
  letreiro: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  rotulo: { marginTop: 8, color: '#555' },
  destaque: { fontSize: 18, fontWeight: 'bold' },
  secao: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  rodape: { textAlign: 'center', padding: 10, color: '#777', fontSize: 12 },
});