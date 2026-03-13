CREATE TABLE `aiRecognitionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`recognizedIngredients` text NOT NULL,
	`recommendedRecipes` text,
	`requestId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiRecognitionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipeId` int NOT NULL,
	`recipeName` varchar(255) NOT NULL,
	`recipeImage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shoppingListItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shoppingListId` int NOT NULL,
	`ingredient` varchar(255) NOT NULL,
	`quantity` varchar(100),
	`unit` varchar(50),
	`checked` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shoppingListItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shoppingLists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shoppingLists_id` PRIMARY KEY(`id`)
);
