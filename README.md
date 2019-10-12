# Discord-Stats (Presence data collector)

Discord bot (written with **discord.js**) that collects data about user's activity (like online time and game activity) by using the presenceUpdate event. The data is saved into an [Enmap](https://github.com/eslachance/enmap)

### Required npm packages

- enmap v4 (+ better-sqlite-pool)
- discord.js

=> Enter token in config.json and run index with node or npm test

## How is the data stored?

Enmap (Enhanced Map) is a system that simply works like JS-Maps (key-value).
In order to store data not only temporary it uses a sqlite database with key and value columns.
The great thing is: By using Enmap storing is really easy and you can access everything using sql (so not necessarily with JS).

### System of keys and values in storing system

| Key                       | Value/Description                                                       |
| ------------------------- | ----------------------------------------------------------------------- |
| {UserID}-started          | {name: "The name of the game", started: JS Timestamp } (only temporary) |
| {UserID}-{GameName}       | Number/Double how long activity has been (complete)                     |
| {UserID}-{GameName}-times | Array of objects for each activity: {start: Timestamp, end: Timestamp}  |
| {UserID}-wentOn           | Created if user went online, saved Timestamp (temporary)                |
| {UserID}-wentIdle         | '' (but regarding idle status) (temporary)                              |
| {UserID}-onlineTime       | Summed up online time of a user                                         |
| {UserID}-idleTime         | Summed up idle time of a user                                           |
| usersToLog                | Array of user ids whose data will be collected                          |

- Hint: "Do not disturb" status is seen as online (Please open issue or open branch with pr if you care about this)

## Bot-commands in order to be TOS and privavy friendly

| Command           | Description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| {prefix}collector | Can be run as server admin, creates info message, each check mark filled is seen as giving consent|
| {prefix}agree     | Consent to being logged; id is added to "usersToLog"                                              |
| {prefix}revoke    | Revoke consent; id is removed from "usersToLog"                                                   |
