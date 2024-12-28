# Step 1: Use an official Node.js runtime as a parent image
FROM node:18

# Step 2: Set the working directory in the container
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install --production

# Step 5: Copy the application code
COPY . .

# Step 6: Build the application
RUN npm run build

# Step 7: Expose the application port
EXPOSE 3000

# Step 8: Start the application
CMD ["npm", "run", "start:prod"]
