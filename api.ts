import fetch, { Headers } from 'node-fetch';
import "dotenv/config.js";

interface User {
  fullName: string;
  email: string;
  password: string;
  token: string;
  dbId: string;
}

interface ClientContent {
  books: any[] | [{
    title: string;
    highlights: string[];
  }];
  clientInfo: User;
}

async function queryTitles(client: ClientContent): Promise<Set<{bookTitle: string, bookId: string}>> {

  // loop through unique database ids and get titles
  var myHeaders = new Headers();
  myHeaders.append("Authorization", `${client.clientInfo.token}`);
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Notion-Version", "2022-06-28");
  
  var raw = "";
  
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  };
  
  const response = fetch(`https://api.notion.com/v1/databases/${client.clientInfo.dbId}/query`, requestOptions)
    .then(response => response.text())
    .then(result => {
      return result;
    })
    .catch(error => console.log('error', error));

  const uniqueTitles = response.then((result) => {
    // add a set of tuples to store titles and ids
    const titles = new Set<{bookTitle: string, bookId: string}>();

    if (result !== undefined) {
      const response = JSON.parse(result).results;
      for (const book of response) {
        titles.add({bookTitle: book.properties.Name.title[0].plain_text, bookId: book.id});
      }
    }

    return titles;
  });

  return uniqueTitles;
}

async function postPage(client: ClientContent, existingTitles: Set<{bookTitle: string, bookId: string}> ): Promise<any> {

  for (const book of client.books) {
    if (existingTitles.has(book.title)) {
      console.log("Title already exists, appending highlights");

      var myHeaders = new Headers();
      myHeaders.append("Authorization", `${client.clientInfo.token}`);
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Notion-Version", "2022-06-28");
      
      var raw = JSON.stringify({
        "children": [
          ...book.highlights.map((highlight: string) => {
            return {
              "object": "block",
              "type": "paragraph",
              "paragraph": {
                "rich_text": [
                  {
                    "type": "text",
                    "text": {
                      "content": `${highlight}`
                    }
                  }
                ]
              }
            }
          })
        ]
      });
      
      var requestOptions = {
        method: 'PATCH',
        headers: myHeaders,
        body: raw,
      };
      
      fetch(`https://api.notion.com/v1/blocks/${client.clientInfo.dbId}/children`, requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
    } else {
      console.log("New title detected");

      var myHeaders = new Headers();
      myHeaders.append("Authorization", `${client.clientInfo.token}`);
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Notion-Version", "2022-06-28");
      
      var raw = JSON.stringify({
        "parent": {
          "database_id": `${client.clientInfo.dbId}`
        },
        "icon": {
          "emoji": "🔏"
        },
        "properties": {
          "Name": {
            "title": [
              {
                "text": {
                  "content": `${book.title}`
                }
              }
            ]
          }
        },
        "children": [
          {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
              "rich_text": [
                {
                  "type": "text",
                  "text": {
                    "content": `Highlights from ${book.title}`
                  }
                }
              ]
            }
          },
          // loop through highlights and add to page
          ...book.highlights.map((highlight: string) => {
            return {
              "object": "block",
              "type": "paragraph",
              "paragraph": {
                "rich_text": [
                  {
                    "type": "text",
                    "text": {
                      "content": `${highlight}`
                    }
                  }
                ]
              }
            }
          })
        ]
      });
      
      var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
      };
      
      fetch("https://api.notion.com/v1/pages", requestOptions)
        .then(response => response.text())
        .then(() => {
          console.log("Posting highlights to Notion");
        })
        .catch(error => console.log('error', error));
    }
  }
};

export default async function postHighlights(client: ClientContent) {

  const existingTitles = await queryTitles(client);
  console.log(existingTitles);
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has
  // has method returns true if the value exists in the set (have to be same object references)

  const response = await postPage(client, existingTitles);
  // return response;
}