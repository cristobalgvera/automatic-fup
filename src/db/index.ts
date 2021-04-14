import {FIREBASE} from '../config';

// This variable can be secured to certain emails
const database = FirebaseApp.getDatabaseByUrl(
  FIREBASE.URL,
  ScriptApp.getOAuthToken()
);

export {database};
