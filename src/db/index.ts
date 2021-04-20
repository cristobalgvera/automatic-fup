import {FIREBASE} from '../config';

// This variable can be secured to certain emails
const database = FirebaseApp.getDatabaseByUrl(
  FIREBASE.URL,
  ScriptApp.getOAuthToken()
);

const messages = {
  alreadyExistMessage: (id: string) => `ID: ${id} already exists`,
  doNotExistMessage: (id: string) => `ID: ${id} don't exists`,
};

export {database, messages};
