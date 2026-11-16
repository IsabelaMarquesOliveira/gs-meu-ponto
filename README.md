# 🚏 Meu Ponto

Aplicativo mobile em React Native (Expo) que avisa quando o ônibus está chegando
no ponto **mais próximo de você**, usando dados em tempo real da **API Olho Vivo da SPTrans**.

Global Solution 2026.2 – Cross-Platform Application Development – FIAP
Área de desafio: Citizen Intelligence & Predictive Analytics

## 📱 O que o app faz

1. A usuária digita o número ou o nome de uma linha (ex.: `8000` ou `Lapa`).
2. O app usa o **GPS do celular** para encontrar, entre os pontos daquela linha, o **mais próximo** dela.
3. Mostra a **previsão de chegada** dos próximos ônibus nesse ponto, indicando os veículos **acessíveis ♿**.
4. Ao tocar em **"Me avise"**, o app verifica a previsão a cada 30 segundos e, quando faltar
   **5 minutos ou menos**, o celular **vibra**, envia uma **notificação** e mostra um **alerta**.

**Problema resolvido:** a pessoa não precisa esperar no ponto sem saber quanto tempo falta,
nem procurar qual é o ponto da linha mais perto dela.

## 🛠️ Tecnologias

- React Native + Expo
- `expo-location`: GPS do celular
- `expo-notifications`: notificações locais
- `Alert` e `Vibration` do React Native
- API Olho Vivo (SPTrans) v2.1

## 🔌 Endpoints da API utilizados

| Endpoint | Uso no app |
|---|---|
| `POST /Login/Autenticar` | Autenticação com o token |
| `GET /Linha/Buscar` | Buscar linhas pelo número ou nome |
| `GET /Parada/BuscarParadasPorLinha` | Pegar todos os pontos da linha (com coordenadas) |
| `GET /Previsao` | Previsão de chegada da linha no ponto |

## 📂 Estrutura do código

```
meu-ponto/
├── App.js            # Tela principal e lógica do app
├── api.js            # Comunicação com a API Olho Vivo
├── localizacao.js    # GPS e cálculo do ponto mais próximo (fórmula de Haversine)
├── notificacoes.js   # Permissão e envio de notificações locais
└── config.js         # Token da API SPTrans
```

## ▶️ Como executar

**Pré-requisitos:** Node.js instalado no computador e o app **Expo Go** no celular (Play Store / App Store).

1. Clone o repositório:
   ```bash
   git clone URL_DO_REPOSITORIO
   cd meu-ponto
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. (Opcional) Troque o token em `config.js` por um token seu, gerado em
   https://www.sptrans.com.br/desenvolvedores/
4. Inicie o projeto:
   ```bash
   npx expo start
   ```
5. Leia o QR Code com o **Expo Go** (Android) ou com a **câmera** (iPhone).
   O celular e o computador devem estar no mesmo Wi-Fi. Se não for possível, use `npx expo start --tunnel`.
6. Permita o acesso à **localização** e às **notificações** quando o app pedir.

## 🎥 Vídeo de demonstração

LINK_DO_YOUTUBE

## 👩‍💻 Integrantes

- Isabela Marques de Oliveira – RM 567230
- Isabelle Ramos de Filippis – RM 566783
- Samy Tamires de Sousa Cruz – RM 566674

## 📊 Créditos

Dados fornecidos pela **SPTrans – API Olho Vivo**.