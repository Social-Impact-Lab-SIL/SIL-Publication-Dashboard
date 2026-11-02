\*\*\*Process Log for GitHub Hosting of SIL Dashboard\*\*\*

\*\*\*Note: In order to do this on an MU computer, you will need to contact your IT person to have Node.js and Git made available in Software Center\*\*\*



Lauren's mockup for an SIL Dashboard includes interactive elements written as React components. Since we want to maintain the interactivity of the page, we need to compile our dashboard as a static site.



To do this you need node.js installed https://nodejs.org/en if it is not already on your machine. Check installation status in command prompt or powershell using:



node -v



The node package powers Vite which I use to create the project hosted on GitHub as the SIL Dashboard page.



\*\*\*Note, I manually created the SIL Dashboard Repository on GitHub page. When doing this I recommend to include the MIT License, but not include README or any other files. They will all be produced within our project.



Once the repository is created, you either need a premium GitHub account, or to have the repository set to public, in order to enable GitHub Pages. To enable Pages, navigate to the correct GitHub repository, then to Settings for that repository, Pages. \*\*\*



Now we are ready to initialize our Vite project. Make sure you are in the working directory you want to use and then Run:



npm create vite@latest lab-dashboard -- --template react

cd lab-dashboard

npm install

npm install recharts



This creates a Vite project named in this case "lab-dashboard" using the react components template. Navigate to the folder you created the project in, then to the 'src' folder within the main directory.



Lauren's mockup file name was named hearing-policy-dashboard.jsx. Following convention created within the Vite project, I renamed this App.jsx and pasted into the 'src' folder.



If your .jsx file is named something different, you will need to alter src/Main.jsx to ensure that it points to the correct .jsx file path containing your info.



We also need to slightly alter the vite.config.js file to direct it to the GitHub host. The vite.config.js file should now read:



import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'



// https://vite.dev/config/

export default defineConfig({

&#x20; plugins: \[react()],

&#x20; base: '/SIL-Publication-Dashboard/',

})



where "SIL-Publication-Dashboard" is the name of the GitHub repository I created to host the dashboard. We wanted to link the dashboard to the landing page, rather than use the dashboard as our landing page for now, so it is stored in a repository within our SIL GitHub site. Because the repository is hosted at (https://social-impact-lab-sil.github.io/SIL-Publication-Dashboard/), GitHub Pages actually serves it from the repository name folder (/SIL-Publication-Dashboard/), not the organization name folder.



This is all to say that you only need the name of the repository in base: not the full directory path.



Now, we are ready to push to GitHub! First, navigate to the root directory of the project we created. It should contain folders like 'src', 'public', and 'node\_modules' as well as some files including the .js we edited earlier.



Create a folder in the root directory called ".gitHub" and within that folder, create another called "workflows". Within the workflows folder, we need to create a .yml file called "deploy.yml" that contains the following deployment code:



name: Deploy to GitHub Pages



on:

&#x20; push:

&#x20;   branches: \[ main ]



permissions:

&#x20; contents: read

&#x20; pages: write

&#x20; id-token: write



jobs:

&#x20; build:

&#x20;   runs-on: ubuntu-latest

&#x20;   steps:

&#x20;     - name: Checkout

&#x20;       uses: actions/checkout@v4

&#x20;     - name: Set up Node

&#x20;       uses: actions/setup-node@v4

&#x20;       with:

&#x20;         node-version: 20

&#x20;         cache: 'npm'

&#x20;     - name: Install dependencies

&#x20;       run: npm install

&#x20;     - name: Build

&#x20;       run: npm run build

&#x20;     - name: Setup Pages

&#x20;       uses: actions/configure-pages@v4

&#x20;     - name: Upload artifact

&#x20;       uses: actions/upload-pages-artifact@v3

&#x20;       with:

&#x20;         path: './dist'



&#x20; deploy:

&#x20;   needs: build

&#x20;   runs-on: ubuntu-latest

&#x20;   environment:

&#x20;     name: github-pages

&#x20;     url: ${{ steps.deployment.outputs.page\_url }}

&#x20;   steps:

&#x20;     - name: Deploy to GitHub Pages

&#x20;       id: deployment

&#x20;       uses: actions/deploy-pages@v4



With the deployment code written, we can push to GitHub. You'll need to make sure the Git command is accessible within cmd/powershell and may have to download it here: git-scm.com



On install, make sure to choose "Git from the command line and also 3rd party software" which is a recommended default option, then restart the cmd/powershell and navigate back to the correct working directory then Run:



git init

git add .

git commit -m "Initial Commit" \*\*\*You can change whats in the quotes\*\*\*

git branch -M main

git remote add origin https://github.com/Social-Impact-Lab-SIL/SIL-Publication-Dashboard.git \*\*\*Make sure this is the correct repository you want to use!!\*\*\*

git push -u origin main



After the final command, you should be prompted for a GitHub login.



Note: I created a README file with the repo and this gave me issues because the Vite project also created a file of the same name. You may need to ensure that the project is using only files from within Vite. Run:



git pull origin main --allow-unrelated-histories -X ours

git add .

git commit -m "Resolve Merge Conflicts"

git push -u origin main



This should resolve any conflicts and use only files from within the Vite project.



Finally, you will need to navigate to Settings -> Pages, then change the dropdown menu from 'Deploy from a branch' to 'GitHub actions. 





At this point you can navigate to the Actions tab in the Repository and ensure that the page is compiling. For me, it didn't start compiling the first time for some reason. I had to prompt it using:



git commit --allow-empty -m "Trigger GitHub Pages Workflow"

git push origin main



Now we can view our page at the link:

https://social-impact-lab-sil.github.io/SIL-Publication-Dashboard/





&#x20;

