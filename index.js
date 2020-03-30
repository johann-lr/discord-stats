/**
 * @author Johann Laur
 * @description Discord bot that collects data about user's usage by using the presenceUpdate Event
 * @module index.js Main file
 * @version 1.0
 */

const { Client } = require("discord.js"),
	config = require("./config.json"),
	Enmap = require("enmap");

const client = new Client();

// run module that handles messages (client#messageEvent)
require("./messageHandler")(client);

// Enmap for easy db management
client.stats = new Enmap({ name: "stats", autoFetch: true, fetchAll: false });
client.voiceStats = new Enmap({ name: "voiceStats", autoFetch: true, fetchAll: false });
client.messageStats = new Enmap({ name: "messageStats", autoFetch: true, fetchAll: false });

client.on("ready", () => {
	console.log("Client Ready");
	// array of users (id) who agreed
	if (!client.stats.has("usersToLog")) client.stats.set("usersToLog", []);
	client.user.setActivity(`${config.prefix}agree`, { type: "LISTENING" });
});

client.on("presenceUpdate", async (oldMember, newMember) => {
	//otherwise enmap database is full of boring bot infos
	if (newMember.user.bot || oldMember.user.bot) return;
	// return if user is not in array of users that agreed
	if (client.stats.get("usersToLog").includes(newMember.user.id)) return;
	let id = newMember.user.id;

	//saves game and start-timestamp to enmap if a user starts playing and did not play anything before
	if (!oldMember.presence.game && newMember.presence.game)
		client.stats.set(`${id}-started`, {
			game: newMember.presence.game.name,
			started: new Date().getTime()
		});

	//saves timestamps and seconds to enmap (after finishing the game)
	if (oldMember.presence.game && !newMember.presence.game) {
		if (!client.stats.has(`${id}-started`)) return; //return starttime was not saved (f.ex. because of bot downtime or we)
		const now = new Date(),
			gameE = client.stats.get(`${id}-started`),
			time = (now.getTime() - gameE.started) / 1000;
		if (!client.stats.has(`${id}-${gameE.game}`)) client.stats.set(`${id}-${gameE.game}`, 0);
		if (!client.stats.has(`${id}-${gameE.game}-times`))
			client.stats.set(`${id}-${gameE.game}-times`, []);
		client.stats.math(`${id}-${gameE.game}`, "+", time); //add played seconds to counter and save start & end time in obj-array
		client.stats.push(`${id}-${gameE.game}-times`, {
			start: new Date(gameE.started),
			end: now
		});
		client.stats.delete(`${id}-started`); //delete start key to prevent errors later
	}

	//almost same stuff like above - triggers when the game presence changes
	if (
		oldMember.presence.game &&
		newMember.presence.game &&
		oldMember.presence.game != newMember.presence.game
	) {
		if (!client.stats.has(`${id}-started`))
			return client.stats.set(`${id}-started`, {
				game: newMember.presence.game.name,
				started: new Date().getTime()
			});
		const now = new Date(),
			gameE = client.stats.get(`${id}-started`),
			time = (now.getTime() - gameE.started) / 1000;
		if (!client.stats.has(`${newMember.user.id}-${gameE.game}`))
			client.stats.set(`${newMember.user.id}-${gameE.game}`, 0);
		if (!client.stats.has(`${id}-${gameE.game}-times`))
			client.stats.set(`${id}-${gameE.game}-times`, []);
		client.stats.math(`${newMember.user.id}-${gameE.game}`, "+", time);
		client.stats.push(`${id}-${gameE.game}-times`, {
			start: new Date(gameE.started),
			end: now
		});
		client.stats.delete(`${id}-started`);
	}

	//function to save online and idle time of a user if their presence status changes
	if (oldMember.presence.status != newMember.presence.status) {
		console.log(`Member status changed: ${newMember.presence.status} (${oldMember.user.tag})`);
		//dnd = online
		if (newMember.presence.status == "online" || newMember.presence.status == "dnd") {
			const now = new Date();
			if (client.stats.has(`${id}-wentIdle`)) {
				//saves idle time if presence changed from idle to online (wentIdle date was saved before)
				if (!client.stats.has(`${id}-idleTime`)) client.stats.set(`${id}-idleTime`, 0);
				let wentIdle = await client.stats.get(`${id}-wentIdle`);
				client.stats.math(`${id}-idleTime`, "+", (now.getTime() - wentIdle) / 1000);
				client.stats.delete(`${id}-wentIdle`);
			}
			client.stats.set(`${id}-wentOn`, now.getTime()); //saves timestamp to get online time later
		}
		//same with idling :D
		if (newMember.presence.status == "idle") {
			const now = new Date();
			if (client.stats.has(`${id}-wentOn`)) {
				if (!client.stats.has(`${id}-onlineTime`)) client.stats.set(`${id}-onlineTime`, 0);
				let wentOn = await client.stats.get(`${id}-wentOn`);
				client.stats.math(`${id}-onlineTime`, "+", (now.getTime() - wentOn) / 1000);
				client.stats.delete(`${id}-wentOn`);
			}
			client.stats.set(`${id}-wentIdle`, now.getTime());
		}
		//saves idle or online (/dnd) time after presence status changes to off
		if (newMember.presence.status == "offline") {
			const now = new Date();
			if (client.stats.has(`${id}-wentOn`)) {
				if (!client.stats.has(`${id}-onlineTime`)) client.stats.set(`${id}-onlineTime`, 0);
				let wentOn = await client.stats.get(`${id}-wentOn`);
				client.stats.math(`${id}-onlineTime`, "+", (now.getTime() - wentOn) / 1000);
				client.stats.delete(`${id}-wentOn`);
			}
			if (client.stats.has(`${id}-wentIdle`)) {
				if (!client.stats.has(`${id}-idleTime`)) client.stats.set(`${id}-idleTime`, 0);
				let wentIdle = await client.stats.get(`${id}-wentIdle`);
				client.stats.math(`${id}-idleTime`, "+", (now.getTime() - wentIdle) / 1000);
				client.stats.delete(`${id}-wentIdle`);
			}
		}
	}
});

client.on("voiceStateUpdate", async (oldMember, newMember) => {
	// same structure as in presenceUpdate
	if (newMember.user.bot || oldMember.user.bot) return;
	if (client.stats.get("usersToLog").indexOf(oldMember.id) == -1) return;

	const id = await newMember.user.id;

	if (!oldMember.voiceChannel && newMember.voiceChannel)
		client.stats.set(`${id}-startedVC`, {
			time: new Date().getTime(),
			channel: newMember.voiceChannel.id
		});
	//if (!client.stats.has(`${newMember.voiceChannelID}-VC`))
	//client.stats.set(`${newMember.voiceChannelID}-VC`, 0);

	if (oldMember.voiceChannel && !newMember.voiceChannel) {
		if (!client.stats.has(`${id}-startedVC`)) return;
		const now = new Date(),
			startedVC = await client.stats.get(`${id}-startedVC`).time;
		if (!client.stats.has(`${id}-voiceTime`)) client.stats.set(`${id}-voiceTime`, 0);
		client.stats.math(`${id}-voiceTime`, "+", (now.getTime() - startedVC) / 1000);
		//if (oldMember.voiceChannel.members.array().length < 1)
		//client.stats.math(`${oldMember.voiceChannel.id}-VCT`, "+", time);
		client.stats.delete(`${id}-startedVC`);
	}
});

client.login(config.token);
