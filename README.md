**# E-VerifyMo**
E-VerifyMo is composed of two interconnected systems (browser extension and desktop application).

**System Architecture**

<img width="1920" height="1080" alt="systemArchi" src="https://github.com/user-attachments/assets/73a226a0-a453-4616-a77d-dd57c9248438" />

	------------------------------------------------------------------------------------------
	
**Technology Stack**

Backend

	Python

	FastAPI

Frontend

	HTML

	CSS

	JavaScript

	Electron

Development Tools

	Git

	GitHub

	Docker 

Database

	AWS

	PostgreSQL

	------------------------------------------------------------------------------------------

**Pre-requisites:** start here

 
Check if python is installed (3.7 or later)

	>>> python --version
	download link: 
		https://www.python.org/downloads/
	
Check if node js installed (version 22 or higher)

	>>> node -- version
	download link:
		https://nodejs.org/en/download

Check if git is installed 

	>>> git --version
	download link: 
		https://git-scm.com/install/windows

	------------------------------------------------------------------------------------------



**Getting the Repository
**
1. Fork the repository

2. Clone the Repository

** FOR BACKEND DEVELOPER**

 Python setup

		1. cd backend
		2. python -m venv .venv //this creates a vitual environment

		activate the venv to run project/ run code / install dependencies

   		3. .\.venv\Scripts\activate

   		4. pip install -r .\requirements.txt // this command installs fastapi, uvicorn, pydantic

      
	FASTAPI official documentation
	
	https://fastapi.tiangolo.com/

**** FOR DESKTOP FRONTEND DEVELOPER**

	check if installed:

		node -v
		npm -v
		
		1. cd desktop frontend
		2. npm install

**Note:** The Vite project and Electron dependency have already been initialized. Do **not** run `npm create vite@latest .` or `npm install --save-dev electron` again


 ELECTRON OFFICIAL DOCUMENTATION

	- React: https://react.dev/
	- Vite: https://vite.dev/
	- Electron: https://www.electronjs.org/docs

**** FOR EXTENSION DEVELOPER**

Load the extension folder in Chrome/Edge using Developer Mode.

	-----------------------------------------------------------------------------------------

	Also, we need to create an env file. copy the contents from env.example

**Naming convention and rules:**

Use camelCase for variable naming.

	Example:

		productTitle
		

Use kebab case in naming files.

	Example:

		nlp-engine.py


Use PascalCase for functions

	Example:
	
		ProductTitleVerification()
		

Use snake_case for classes

	Example:
	
		product_extraction
		

Use all lowercase for folder

Example:

	source
	

	------------------------------------------------------------------------------------------

**Commit Conventions**

feat - new feature

	feat: add complaint status tracking 
  
fix - bug fix

	fix: prevent duplicate complaint submissions 
  
docs - documentation / comments change

	docs: update installation guide 
  
refactor - change code structure

	refactor: move validation logic to service layer 
  
test -  Add or update tests 

	test: add unit tests for product matching 
  
style -  formatting, linting, whitespaces changes

	style: format code with black 
  
chore - maintenance tasks

  	chore: update dependencies 
  
perf - Performance improvements 

  	perf: optimize semantic similarity search
  
build - Build system or dependency changes 

 	build: add Docker configuration
  	
others - other changes not mentioned above

	------------------------------------------------------------------------------------------


.gitkeep are temporary and placeholder files. Do not remove them unless the directory already contains actual project files.

	------------------------------------------------------------------------------------------
	
The folders given are based on common file structures; they are subject to change to match the suitable needs of each system. 

Directory Guide:

api - contains the routes/endpoints that clients call.
core - Holds configurations and security settings:
internal - Contains internal modules that are only used inside the backend.
models - Defines database tables and structures. describes the tables.
db - manages the connection of database / tables.
router - Contains API endpoints.
schemas - Defines the format of data sent and received by the API.
services - this is where the system logic lives.
utils - Contains reusable helper functions.

test - Used to verify that code works correctly.
uploads - Stores uploaded files.

main.py The entry point of the FastAPI application. Used to start the server.

assets -  Stores static files.
pages - Contains full extension pages.
popup - Contains the popup shown when the user clicks the extension icon.
scripts - Contains JavaScript files used by the extension.
utils - Contains reusable helper functions.
manifest.json - The browser extension configuration file.

pages - Contains HTML pages.
css -stylesheets
js - Contains JavaScript files.
public - Contains static assets used by the frontend.
index.html - The main entry page of the website.


sources : 
	https://dev.to/mohammad222pr/structuring-a-fastapi-project-best-practices-53l6

	------------------------------------------------------------------------------------------

Use the dedicated branch depending on the changes made.
Do not push or make changes to **main or develop** branches
add more branch if needed

always commit every progress






