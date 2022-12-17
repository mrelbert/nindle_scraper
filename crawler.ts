import puppeteer from 'puppeteer';

interface ClientContent {
  books: any[] | [{
    title: string;
    highlights: string[];
  }];
  clientInfo: User;
}

interface User {
  fullName: string;
  email: string;
  password: string;
  token: string;
  dbId: string;
}

async function launchCrawler(user: User): Promise<ClientContent> {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();

  await page.goto('https://read.amazon.com/notebook');

  // type into email field
  await page.type('#ap_email', user.email);
  // type into password field
  await page.type('#ap_password', user.password);
  // click on login button
  await page.click('#signInSubmit');
  // wait for navigation to home page
  await page.waitForNavigation();

  // wait for books to load
  await page.waitForSelector('#library-section');

  const books = await page.evaluate(() => {
    const library = document.querySelector('#kp-notebook-library');
    const books = Array.from(library!.children).filter(child => child.tagName === 'DIV');
    return books;
  });

  console.log(`Number of books for ${user.fullName}: ` + books.length);
  const numBooks: number = books.length;

  let client: ClientContent = {
    books: [],
    clientInfo: user,
  }

  // iterate through books and click on each one
  for (let i = 0; i < numBooks; i++) {

    // get book title
    const bookTitle: string = await page.evaluate((i) => {
      const library = document.querySelector('#kp-notebook-library');
      const books = Array.from(library!.children).filter(child => child.tagName === 'DIV');
      const book = books[i];
      const title = book.getElementsByTagName('h2')[0].textContent;

      if (title) {  
        return title;
      } else {
        throw new Error('No title found');
      }
    }, i);

    // open book highlights
    await page.click(`#kp-notebook-library > div:nth-child(${i + 1})`);

    // wait for highlight selector to load and get highlights
    await page.waitForSelector('#highlight');
    const highlights: string[] = await page.evaluate(() => {
      const highlight = document.querySelectorAll('#highlight');
      const pages = document.querySelectorAll('#annotationHighlightHeader');

      // map highlight with pages
      const highlightsWithPages = Array.from(highlight).map((highlight, index) => {
        return {
          highlight: highlight,
          page: pages[index],
        }
      });

      let highlights: string[] = [];

      highlightsWithPages.forEach(value => {
        if (typeof value.highlight.textContent === 'string') {
          highlights.push(value.highlight.textContent + ' ---- ' + value.page.textContent);
        } else {
          throw new Error('Highlight is not a string');
        }
      });

      return highlights;
    });

    client.books.push({title: bookTitle, highlights: highlights});
  }

  // await browser.close();

  return client;
};

export default async function fetchHighlights(users: User[]) {
  let clients = [];
  for (const user of users) {
    const client = await launchCrawler(user);
    clients.push(client);
  }
  return clients;
}