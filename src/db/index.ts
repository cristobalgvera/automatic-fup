import {FIREBASE} from '../config/firebase.config';

// This variable can be secured to certain emails
const database = FirebaseApp.getDatabaseByUrl(FIREBASE.URL, FIREBASE.SECRET);

export {database};
