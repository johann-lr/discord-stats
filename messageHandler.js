/**
 * @author Johann Laur
 * @module messageHandler.js
 * @version 1.0
 * @exports Event message of discord client
 * @requires client discord client
 * @requires discord.js npm module
 * @requires config.json with prefix
 */

const Discord = require("discord.js");
const config = require("./config.json");
let msg = new Discord.RichEmbed()
  .setColor(7506394)
  .setTitle("Logging of user data")
  .setDescription(
    "This bot collects user data about your discord usage by using the presence status in discord.\nIt only saves your message id with your online/idle time and game activitys.\nOf course this can not be done by default so if you agree just react with :white_check_mark:!"
  )
  .setTimestamp();

module.exports = client => {
  client.on("message", message => {
    // command to create a reaction collector for agreement
    if (message.content.startsWith(`${config.prefix}collector`)) {
      if (!message.member.hasPermission("ADMINISTRATOR")) return message.delete();

      message.channel.send(msg).then(m => {
        m.react("✅");
        const filter = (reaction, user) => reaction.emoji.name === "✅";
        const collector = m.createReactionCollector(filter);
        collector.on("collect", (element, collector) => {
          let users = element.users.map(x => x.id);
          users.forEach(async element => {
            await client.stats.push("usersToLog", element);
          });
        });
      });
      message.delete();
    }

    // simple way to agree and get pushed into "usersToLog" array
    if (message.content.startsWith(`${config.prefix}agree`)) {
      let userID = message.author.id;
      client.stats.push("usersToLog", userID);
      message.react("✅");
    }

    // command to revoke agreement
    if (message.content.startsWith(`${config.prefix}revoke`)) {
      let userID = message.author.id;
      let arr = client.stats.get("usersToLog");
      let index = arr.indexOf(userID);
      if (index == -1)
        return message.channel.send(`You did not agree yet! (Just type ${config.prefix}agree)`);
      arr.splice(index, index);
      client.stats.set("usersToLog", arr);
      message.react("✅");
    }
  });
};
