# Existing solutions (research, 19 Sep 2026)

Question: does a product like Evac Caller already exist?

## What exists
- **ES-Alert** (Spain's version of EU-Alert). It uses Cell Broadcast: every phone in an area gets the same short message. It is **one-way**. Senders don't know who received it, and nobody can reply or ask a question. It has been fully used since Feb 2023. https://es.wikipedia.org/wiki/EU-Alert · https://en.wikipedia.org/wiki/Cell_Broadcast
  - **16 Sep 2026 storm:** Protecció Civil sent ES-Alerts for Barcelonès, Maresme and other comarques. This is what our teammate's friend received. On 17 Sep there was criticism about the timing.
  - **Torrefeta wildfire (Jul 2025):** an ES-Alert confined more than 20,000 people. https://ca.wikipedia.org/wiki/Incendi_de_Torrefeta_de_2025
  - **Valencia DANA (Oct 2024):** the alert came about 12 hours after the red warning. https://en.wikipedia.org/wiki/2024_Spanish_floods
- **Everbridge and Genasys Protect:** commercial mass-notification tools. They send SMS and recorded or text-to-speech voice calls to zones, and people confirm with "press 1". They don't have a conversational AI that answers questions. https://www.everbridge.com/products/mass-notification/ · https://www.genasys.com/genasys-protect
- **Cal Fire AI chatbot (2025):** people criticized it because it couldn't answer evacuation questions ("I'm not sure"). It was not connected to the evacuation data. https://www.rstreet.org/commentary/cal-fires-innovation-theater-creates-a-chatbot-safety-risk/

## Real cases of the problem
- **Paiporta care home (DANA 2024):** 6 residents died. The home says it received no warning. (El Mundo 21 Oct 2025, El País 6 May 2025, elDiario.es 23 Mar 2026)
- **Madrid fires (Jul 2026):** 4 care homes and a disability centre were evacuated. The press wrote about the "absence of evacuation plans".
- We found no public protocol in Catalonia for warning each care home, school or hospital one by one. Today it probably goes CECAT → town hall → local phone calls (not confirmed).

## Our gap and pitch
ES-Alert tells **everyone** in an area, one way. Evac Caller makes sure that the **specific places with vulnerable people** (care homes, hospitals, schools, which need hours to move) have **heard, understood and confirmed**. Places that didn't confirm go to a human. It works **next to** ES-Alert and 112, and does not replace them.

We are the only ones combining these three things:
1. Places chosen from real fire and wind data.
2. A human coordinator approves before any call.
3. A conversational call that only uses verified facts, and records "confirmed / needs help / no answer".
