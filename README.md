# How to migrate Trello board data to dash incubator 

This migrator migrates all users and cards in current dash trello board.

As the migrator don't know the password for the trello users, it sets the default password for all users.

Default password is `password`.

`DB_URL` could be specified in codebase.

`const uri = "mongodb+srv://<user>:<password>@<cluster-url>?writeConcern=majority"`

To run the migrator, specify database url to appropriate one and then run following commands.

`npm i`

`node index.js`
