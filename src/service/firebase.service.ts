function test() {
  const database = FirebaseApp.getDatabaseByUrl(
    'https://automatic-fup-no-latam-default-rtdb.firebaseio.com',
    'foPHgqbTqraMVBAhWfcXblwLVDc4jHyMkBttKNDn'
  );
  database.updateData('test', {e: 'working!'});
  Logger.log(database.getData());
}
