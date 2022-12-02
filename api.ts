import fetch, { Headers } from 'node-fetch';
import "dotenv/config.js";

interface Highlight {
  title: string;
  highlights: string[];
  token: string;
  fullName?: string;
  email?: string;
  password?: string;
  databaseId?: string;
}

function queryTitles(highlights: Highlight[]) {
  // loop through highlights and store tokens and database id
  const tokens: Set<{token: string, databaseId: string}> = new Set();
  for (const highlight of highlights) {
    const token = highlight.token;
    const databaseId = highlight.databaseId;
    tokens.add({"token": token, "databaseId": databaseId as string});
  }

  // set that would store titles
  const uniqueTitles: Set<string> = new Set();

  // loop through unique database ids and get titles
  for (const tokenObj of tokens) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", `${tokenObj.token}`);
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Notion-Version", "2022-06-28");
    
    var raw = "";
    
    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
    };
    
    const response = fetch(`https://api.notion.com/v1/databases/${tokenObj.databaseId}/query`, requestOptions)
      .then(response => response.text())
      .then(result => {
        console.log("Getting list of unique titles")
        return result;
      })
      .catch(error => console.log('error', error));

    response.then((result) => {
      if (result !== undefined) {
        const objects = JSON.parse(result).results;

        for (const object of objects) {
          uniqueTitles.add(object.properties.Name.title[0].plain_text);
        }
        console.log(uniqueTitles);
      }
    });
  }

  return uniqueTitles;
}

async function postPage(highlights: Highlight[], titles: Set<string>): Promise<any> {
  console.log(highlights);

  for (const highlight of highlights) {
    if (titles.has(highlight.title)) {
      console.log("Title already exists");
      continue;
    } else {
      var myHeaders = new Headers();
      myHeaders.append("Authorization", `${highlight.token}`);
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Notion-Version", "2022-06-28");
      
      var raw = JSON.stringify({
        "parent": {
          "database_id": `${highlight.databaseId}`
        },
        "icon": {
          "emoji": "🔏"
        },
        "properties": {
          "Name": {
            "title": [
              {
                "text": {
                  "content": `${highlight.title}`
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
                    "content": `Highlights from ${highlight.title}`
                  }
                }
              ]
            }
          },
          // loop through highlights and add to page
          ...highlight.highlights.map(highlight => {
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

export default async function postHighlights(highlights: Highlight[]): Promise<any> {
  // query db and get list of all book titles then return a hashmap [key: title, value: page id]
  const titles = queryTitles(highlights);

  const response = await postPage(highlights, titles);
  return response;
}