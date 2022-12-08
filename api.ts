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

interface Props {
  [key: string]: string;
}

async function queryTitles(client: ClientContent): Promise<Props> {

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

    const titles: Props = {};

    if (result !== undefined) {
      const response = JSON.parse(result).results;
      for (const book of response) {
        // if book is not in titles object, add it
        if (book.properties.Name.title.length > 0) {
          if (!titles[book.properties.Name.title[0].text.content]) {
            titles[book.properties.Name.title[0].text.content] = book.id;
          }
        }
      }
    }

    return titles;
  });

  return uniqueTitles;
}

async function postPage(client: ClientContent, existingTitles: Props ): Promise<any> {

  for (const book of client.books) {
    if (book.title in existingTitles) {
      console.log("Title already exists - deleting page and re-creating it");

      var myHeaders = new Headers();
      myHeaders.append("Authorization", `${client.clientInfo.token}`);
      myHeaders.append("Notion-Version", "2022-06-28");
      
      var deleteRequestOptions = {
        method: 'DELETE',
        headers: myHeaders,
      };
      
      fetch(`https://api.notion.com/v1/blocks/${existingTitles[book.title]}`, deleteRequestOptions)
        .then(response => response.text())
        .then(result => {
          console.log("Now posting...", result);
          
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
                  "type": "quote",
                  "quote": {
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
          
          var postRequestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
          };
          
          fetch("https://api.notion.com/v1/pages", postRequestOptions)
            .then(response => response.text())
            .then(() => {
              console.log("Posting highlights to Notion");
            })
            .catch(error => console.log('error', error));
        })
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
              "type": "quote",
              "quote": {
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
      
      var postRequestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
      };
      
      fetch("https://api.notion.com/v1/pages", postRequestOptions)
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
  await postPage(client, existingTitles);
}