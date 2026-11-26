# WOD to Seconds

Applicazione statica gratuita, senza backend, database, account visitatori o chiavi API. OCR locale con Tesseract.js 6.0.1, parser JavaScript deterministico ed esportazione dal template Seconds fornito.

## Avvio e test

Servire la cartella con un server HTTP statico, per esempio `python -m http.server 8765`. Aprire `http://localhost:8765`. Non aprire direttamente index.html con file://: moduli, fetch e PWA richiedono HTTP/HTTPS.

Con Node.js 22: `npm test`. In ambienti che impediscono processi figli: `node --test --experimental-test-isolation=none tests/parser.test.js`. Nessuna installazione npm necessaria.

## Pubblicazione gratuita

Repository pubblico GitHub, sorgente Pages dal branch main e cartella root. File e URL relativi funzionano anche sotto `/nome-repository/`. Nessun dominio acquistato, piano premium, server o API commerciale necessari. `.nojekyll` evita elaborazioni Jekyll. GitHub Pages offre hosting per repository pubblici su GitHub Free, soggetto ai limiti del servizio: sito massimo 1 GB, limite soft di banda 100 GB/mese, limiti di build. Non è un servizio a disponibilità garantita.

Fonti verificate il 26 novembre 2026:
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://github.com/naptha/tesseract.js

## Sintassi supportata

Un blocco inizia con EMOM, E2MOM, E3MOM, AMRAP, TABATA, FOR TIME o INTERVAL. Esercizi su righe separate oppure dopo ` — ` o `: `. `;`, `poi`, `then` dividono le righe. `+` mantiene più esercizi nella stessa finestra. Ripetizioni e carichi restano nel nome; non vengono convertiti in secondi stimati.

```
E2MOM 12 min
8 front squat 40 kg + 10 box jump
12 calorie row

Recupero 90 s

AMRAP 8 min
5 pull-up
10 push-up
15 air squat

FOR TIME 3 round
Time cap 6 min
10 burpees
20 sit-up
```

- EMOM/E2MOM/E3MOM: durata totale multipla della finestra, oppure round. Ogni riga corrisponde a una stazione; i round sono cicli di tutte le stazioni. Un giro parziale è segnalato.
- AMRAP: un unico intervallo; numero di giri libero.
- FOR TIME: un unico intervallo con time cap obbligatorio; nessuna stima dei tempi per esercizio.
- TABATA: standard 8 round 20/10, recupero finale incluso; personalizzabile con `TABATA 6 round 30/15`.
- INTERVAL: durata su ogni riga, es. `Row 40 s`, `Rest 20 s`.
- Recupero tra blocchi: `Recupero 90 s`.

## Limiti e compatibilità

Questo parser non è un modello linguistico. Descrizioni arbitrarie, piramidi, round annidati, protocolli proprietari, abbreviazioni e foto manoscritte possono richiedere riscrittura. La sequenza deve essere controllata dall’utente. Massimo 20.000 caratteri e 2.000 intervalli; immagini JPG/PNG/WebP fino a 15 MB. HEIC deve essere convertito.

L’esportatore conserva struttura e opzioni del template originale, espande tutti gli intervalli e imposta numberOfSets=1. Solo i codici colore 0 e 5 sono presenti nel template: gli altri sono sperimentali. L’anteprima usa una palette visiva indipendente; il codice 7 è riservato ai recuperi. Non è stata effettuata una prova d’importazione in Seconds Pro: struttura JSON e parità con Python non equivalgono a compatibilità verificata nell’app. Anche l’installazione su dispositivi iOS/Android fisici resta da verificare.

Seconds Pro è un’app esterna: eventuali costi per acquistarla non fanno parte di questo sito. Il sito non richiede acquisti, abbonamenti o carte e genera il file gratuitamente.

## Privacy, rete e PWA

Le immagini passano come File al worker OCR locale; non esiste alcun endpoint di upload. Testo e immagini non sono salvati su un database, localStorage o analytics. Il service worker memorizza soltanto asset statici; Tesseract può memorizzare modelli linguistici. Il testo inserito viene incluso nelle note del file scaricato.

L’OCR scarica script, worker, WebAssembly e modelli ita+eng dai CDN predefiniti di Tesseract (jsDelivr e tessdata.projectnaptha.com). Questi provider e GitHub ricevono le normali richieste di rete e i relativi metadati, non le immagini. Non sono richiesti account o chiavi API per questi download. Connessione necessaria al primo caricamento OCR; offline OCR non garantito. Testo e generazione funzionano dopo il precaching PWA, quando il service worker è attivo. Nessuna promessa di disponibilità futura dei CDN.

Modificare il nome CACHE in sw.js a ogni nuova versione per aggiornare gli asset offline. I percorsi sono relativi per GitHub Pages. Icone PNG 192/512 e manifest includono modalità standalone.

## Dipendenze

Tesseract.js è software open source Apache-2.0 (https://github.com/naptha/tesseract.js/blob/master/LICENSE.md), caricato dal CDN senza incorporarne il codice nel repository. Template derivato dal materiale fornito dal proprietario del progetto. Nessun font, immagine stock o servizio AI esterno.


## Aggiornamento: archivio e interpretazione
Salvataggi volontari in localStorage, senza foto. I dati restano nel browser e si perdono cancellando i dati del sito. Ogni salvataggio ha un QR generato localmente con qrcode-generator 1.4.4 (MIT, caricato da jsDelivr). Il QR contiene il WOD compresso nel frammento del link: chi lo riceve può importarlo e salvarlo. Limite di capacità del QR; allenamenti molto grandi possono non essere condivisibili in un singolo QR. Generazione QR iniziale richiede rete. Testato il link di importazione, non una fotocamera fisica.

Supportati gli ordinali e range di stazioni (5°-6° REST), progressioni di ripetizioni per un esercizio EMOM/E2MOM/E3MOM e formulazioni inglesi AMRAP/Every N minutes. START 60% viene conservato al primo intervallo; nessuna progressione dei carichi viene inventata. Intestazione generica For Time prima di EMOM tollerata solo se priva di durata/esercizi.

Test da fonti ufficiali: Cindy (https://www.crossfit.com/benchmark/cindy), Fran (https://www.crossfit.com/benchmark/fran), Helen (https://www.crossfit.com/benchmark/helen), Tabata This (https://www.crossfit.com/faq). Tabata This è testato riscrivendo il protocollo in blocchi espliciti; il nome o una descrizione non supportata non bastano a riconoscerlo automaticamente. Fran/Helen senza cap producono richiesta di durata, non tempi stimati. Non è un interprete universale né AI. Formati a esaurimento e Tabata complessi non esplicitati richiedono chiarimenti.
