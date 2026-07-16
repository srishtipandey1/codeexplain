# CodeExplain

CodeExplain is a full-stack, local-first code analysis and educational tool. Built with React, TypeScript, and Express, it parses code structures to generate explanations, complexity measurements, refactoring suggestions, flowcharts, and interactive comprehension quizzes.

---

## Core Features

The application is structured into several modular panels:

*   **Workspace Explorer**: Allows users to load and view project files or write code in an inline editor. It automatically detects programming languages and provides syntax highlighting.
*   **Overview Panel**: Displays code metrics, lines of code, and lets users inspect lines for targeted context.
*   **Explanation**: Generates plain-language walkthroughs of the selected code's logic and design.
*   **Optimization & Complexity**: Provides Big-O asymptotic analysis (time and space complexity) and compares the input snippet side-by-side with refactored alternatives.
*   **Visualizations**: Builds diagrams of standard execution loops or control-flow logic.
*   **Quizzes**: Creates multiple-choice quizzes based on the uploaded file to test code understanding.
*   **Contextual Chat**: Allows chatting with an assistant about functions, variables, or general logic in the file, with support for pre-set prompt shortcuts.

---

## Technical Stack

*   **Frontend**: React 19, TypeScript, Vite 6
*   **Styling**: Tailwind CSS 4
*   **Animations**: Motion (formerly Framer Motion)
*   **Editor**: Monaco Editor (`@monaco-editor/react`)
*   **Backend**: Express v4 serving REST API endpoints
*   **Dev / Build**: `tsx` for backend execution and `esbuild` for production compilation

---

## Local Installation & Setup

To run CodeExplain on your machine, follow these steps:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (version 18 or above is recommended).

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/srishtipandey1/codeexplain.git
cd codeexplain

# Install package dependencies
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory. You can use the provided `.env.example` as a template:

```bash
cp .env.example .env
```

Open `.env` and add your Groq Cloud API key:
```env
GROQ_API_KEY="your_groq_api_key_here"
```

### 4. Start the Application
To run both the frontend and the backend server in development mode:

```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 5. Production Build
To create a optimized production build of the assets and server:

```bash
# Build the application
npm run build

# Start the compiled bundle production server
npm run start
```

---

## Git Operations & GitHub Guidelines

Below are the steps to push updates safely to your GitHub repository.

### Initializing the Repository
If you are initializing this folder as a git repository for the first time:

```bash
git init
git branch -M main
git remote add origin https://github.com/srishtipandey1/codeexplain.git
```

### Staging and Committing Changes
When you add or modify files:

```bash
# Stage changes
git add .

# Create a commit
git commit -m "Configure environment variable authentication"
```

### Pushing to GitHub
To push your main branch:

```bash
git push -u origin main
```

---

## License
Distributed under the MIT License. See `LICENSE` (if present) for details.
