import fetch, { Headers } from 'node-fetch';
import crawler from './crawler.js';
import postHighlights from './api.js';
import "dotenv/config.js";

interface User {
  fullName: string;
  email: string;
  password: string;
  token?: string;
  dbId?: string;
}

async function handleFetch(): Promise<User[]> {
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
    .catch(error => console.log('error', error));

  const usersInfo = result.then(
    (value) => {

      if (value !== undefined) {
        const objects = JSON.parse(value).results;
        console.log(objects);
        const users: User[] = [];

        for (const object of objects) {

          const user: User = {
            fullName: object.properties.Name.title[0].plain_text,
            email: object.properties.Email.rich_text[0].plain_text,
            password: object.properties.Password.rich_text[0].plain_text,
            token: object.properties.Token.rich_text[0].plain_text,
            dbId: object.properties.Database.rich_text[0].plain_text
          };

          users.push(user);
        }

        return users;
      } else {
        throw new Error("No value");
      }
    }
  );

  return usersInfo;
}

async function main() {
  console.log("Fetching users..");
  const users = await handleFetch();
  console.log("Users fetched!");

  console.log("Launching crawler..");
  const highlights = await crawler(users);
  console.log("Crawler launched!");

  // combine users and highlights based on token
  for (const highlight of highlights) {
    for (const user of users) {
      if (highlight.token === user.token) {
        highlight.fullName = user.fullName;
        highlight.email = user.email;
        highlight.password = user.password;  
        highlight.databaseId = user.dbId;
      }
    }
  }

  console.log("Highlights: ", highlights);

  console.log("Posting highlights..");
  await postHighlights(highlights);
  console.log("Highlights posted!");
}

main();
