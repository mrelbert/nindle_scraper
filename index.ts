import fetch, { Headers } from 'node-fetch';
import crawler from './crawler.js';

interface User {
  fullName: string;
  email: string;
  password: string;
}

function handleFetch(): Promise<User[]> {
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "secret_lDDAPUBbBvIjFDgziDEIUpye2KHEU2QZyyuGFGndztz");
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Notion-Version", "2022-06-28");
  
  var raw = "";
  
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  };
  
  const result = fetch("https://api.notion.com/v1/databases/0d4b28844f8242a9945681e7caff647b/query", requestOptions)
    .then(response => response.text())
    .then(result => {
      return result;
    })
    .catch(error => console.log('error', error));

  const usersInfo = result.then(
    (value) => {

      if (value !== undefined) {
        const objects = JSON.parse(value).results;
        const users: User[] = [];

        for (const object of objects) {

          const user: User = {
            fullName: object.properties.Name.title[0].plain_text,
            email: object.properties.Email.rich_text[0].plain_text,
            password: object.properties.Password.rich_text[0].plain_text
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

function main() {
  console.log("Running from main..");
  console.log("Call fetch from main..");
  const users = handleFetch();
  console.log("users:", users.then((value) => {
    console.log(value);
    crawler(value);
  }));
}

main();
