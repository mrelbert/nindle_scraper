import fetch, { Headers } from 'node-fetch';
import fetchHighlights from './crawler.js';
import postHighlights from './api.js';
import "dotenv/config.js";

interface User {
  fullName: string;
  email: string;
  password: string;
  token: string;
  dbId: string;
}

async function fetchUsers(): Promise<User[]> {
  var myHeaders = new Headers();
  myHeaders.append("Authorization", process.env.ELBERTS_TECH_SECRET as string);
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Notion-Version", "2022-06-28");
  
  var raw = "";
  
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  };
  
  const result = fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DB}/query`, requestOptions)
    .then(response => response.text())
    .then(result => {
      return result;
    })
    .catch(error => console.log('error while fetching users:', error));

  const usersInfo = result.then(
    (value) => {

      if (value !== undefined) {
        const clients = JSON.parse(value).results;
        const users: User[] = [];

        for (const client of clients) {

          const user: User = {
            fullName: client.properties.Name.title[0].plain_text,
            email: client.properties.Email.rich_text[0].plain_text,
            password: client.properties.Password.rich_text[0].plain_text,
            token: client.properties.Token.rich_text[0].plain_text,
            dbId: client.properties.Database.rich_text[0].plain_text
          };

          users.push(user);
        }

        return users;
      } else {
        throw new Error("No users detected");
      }
    }
  );

  return usersInfo;
}

async function main() {
  console.log("Fetching users..");
  const users = await fetchUsers();
  console.log("Users fetched!");

  console.log("Launching puppeteer..");
  const clients = await fetchHighlights(users);
  console.log("Highlights fetched!", clients);

  console.log("Posting highlights..");
  for (const client of clients) {
    postHighlights(client);
    console.log("Posted highlights for " + client.clientInfo.fullName + " to Notion!")
  }
  console.log("Process complete!")

  process.exit(0);
}

main();
