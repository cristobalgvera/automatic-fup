_Based on ***[this](https://github.com/cristobalgvera/ez-clasp)*** template_

# 💻 TL;DR:

_\* Only will works with LATAM Google credentials_

```bash
git clone https://github.com/cristobalgvera/automatic-fup.git
cd automatic-fup
npm i

# If you didn't activate your Google dev stuff yet,
# read template repository and follow the instructions

clasp login # Log into your LATAM Google account
```

To deploy code to the cloud

```bash
# Inside project after 'npm i'
npm run deploy
```

# 📖 A brief description and process workflow

This project was created to helps LATAM company to easily contact vendors in order to know certain kind of information about the open orders marked as vendor as responsible.

The objective of this project is to bring information to vendors about his open orders with LATAM and also include received information in LATAM systems to helps teams to managed these lines.

This is accomplished through Gmail service via Excel files. Vendors receive an email with a file in a certain format and, once him respond, that file will be read and persisted in a Firebase database instance.

After information is stored in the Firebase database, a task will take these registries and will put into LATAM systems following some business rules to helps teams to identify them.

All the project was created following a circular way, that means whenever process flow is over, cycle will be finished and executed again, looking for new changes inside of teams databases.

# 🔗 Services in use

- Google Apps Script.
- Drive API.
- Firebase.
- Google Sheet.
- Gmail.

# 🔧 Tecnologías utilizadas

- Node.js
- TypeScript / JavaScript.
- Rollup.js
- Babel.
- Prettier.
- ESLint.
