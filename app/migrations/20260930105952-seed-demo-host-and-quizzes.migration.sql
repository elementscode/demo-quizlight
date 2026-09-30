-- seed demo host and quizzes

insert into users (email, name, passwordHash)
     values ('host@quizlight.test', 'Quiz Host', crypt('gamenight', genSalt('bf', 12)));

insert into quizzes (userId, title, blurb)
  select id, t.title, t.blurb
    from users,
         (values ('Around the World', 'Capitals, rivers, deserts and the odd tiny country.'),
                 ('Silver Screen', 'Blockbusters, classics and the lines everyone quotes.'),
                 ('Lab Coats On', 'Elements, planets, and the body you live in.')) as t (title, blurb)
   where email = 'host@quizlight.test';

insert into questions (quizId, position, prompt, answerA, answerB, answerC, answerD, correct, timeLimit)
  select q.id, v.position, v.prompt, v.a, v.b, v.c, v.d, v.correct, v.timeLimit
    from quizzes q,
         (values
           (1, 'What is the capital of Australia?', 'Sydney', 'Melbourne', 'Canberra', 'Perth', 2, 20),
           (2, 'Which is the longest river in Africa?', 'Congo', 'Nile', 'Niger', 'Zambezi', 1, 20),
           (3, 'Mount Kilimanjaro is in which country?', 'Tanzania', 'Kenya', 'Uganda', 'Ethiopia', 0, 20),
           (4, 'Which country has the most natural lakes?', 'Russia', 'United States', 'Finland', 'Canada', 3, 20),
           (5, 'What is the smallest country in the world by area?', 'Monaco', 'Vatican City', 'San Marino', 'Liechtenstein', 1, 15),
           (6, 'Which is the largest hot desert on Earth?', 'Gobi', 'Kalahari', 'Sahara', 'Arabian', 2, 15),
           (7, 'Reykjavik is the capital of which country?', 'Iceland', 'Norway', 'Greenland', 'Denmark', 0, 15),
           (8, 'Which ocean is the deepest?', 'Atlantic', 'Indian', 'Arctic', 'Pacific', 3, 20),
           (9, 'Which mountain range runs down the west coast of South America?', 'Rockies', 'Andes', 'Alps', 'Atlas', 1, 20),
           (10, 'The city of Marrakesh is in which country?', 'Egypt', 'Tunisia', 'Morocco', 'Algeria', 2, 20)
         ) as v (position, prompt, a, b, c, d, correct, timeLimit)
   where q.title = 'Around the World';

insert into questions (quizId, position, prompt, answerA, answerB, answerC, answerD, correct, timeLimit)
  select q.id, v.position, v.prompt, v.a, v.b, v.c, v.d, v.correct, v.timeLimit
    from quizzes q,
         (values
           (1, 'Who directed Jurassic Park (1993)?', 'Steven Spielberg', 'James Cameron', 'George Lucas', 'Ridley Scott', 0, 20),
           (2, 'In The Matrix, which pill does Neo take?', 'Blue', 'Red', 'Green', 'Yellow', 1, 15),
           (3, 'Which hobbit does Elijah Wood play in The Lord of the Rings?', 'Samwise', 'Bilbo', 'Frodo', 'Pippin', 2, 15),
           (4, 'Which film has the line "Here''s looking at you, kid"?', 'Gone with the Wind', 'Citizen Kane', 'The Maltese Falcon', 'Casablanca', 3, 20),
           (5, 'What was Pixar''s first feature film?', 'A Bug''s Life', 'Toy Story', 'Monsters, Inc.', 'Finding Nemo', 1, 15),
           (6, 'Who played Jack in Titanic?', 'Leonardo DiCaprio', 'Brad Pitt', 'Matt Damon', 'Johnny Depp', 0, 15),
           (7, 'In Back to the Future, what speed must the DeLorean reach?', '66 mph', '77 mph', '88 mph', '99 mph', 2, 20),
           (8, 'Which film is set on the moon Pandora?', 'Dune', 'Interstellar', 'Star Wars', 'Avatar', 3, 15),
           (9, 'Who composed the score for Star Wars?', 'Hans Zimmer', 'John Williams', 'Ennio Morricone', 'Howard Shore', 1, 20),
           (10, 'What kind of animal is Babe?', 'Sheep', 'Dog', 'Pig', 'Duck', 2, 10)
         ) as v (position, prompt, a, b, c, d, correct, timeLimit)
   where q.title = 'Silver Screen';

insert into questions (quizId, position, prompt, answerA, answerB, answerC, answerD, correct, timeLimit)
  select q.id, v.position, v.prompt, v.a, v.b, v.c, v.d, v.correct, v.timeLimit
    from quizzes q,
         (values
           (1, 'What is the chemical symbol for gold?', 'Ag', 'Au', 'Gd', 'Go', 1, 15),
           (2, 'Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Jupiter', 'Mercury', 0, 10),
           (3, 'How many bones are in the adult human body?', '186', '196', '206', '216', 2, 20),
           (4, 'Which gas do plants take in for photosynthesis?', 'Oxygen', 'Nitrogen', 'Hydrogen', 'Carbon dioxide', 3, 15),
           (5, 'Roughly how fast does light travel?', '300 km/s', '300,000 km/s', '30,000 km/s', '3,000,000 km/s', 1, 20),
           (6, 'Which particle carries a negative charge?', 'Electron', 'Proton', 'Neutron', 'Photon', 0, 15),
           (7, 'What is the hardest natural substance?', 'Quartz', 'Titanium', 'Diamond', 'Granite', 2, 15),
           (8, 'Which organ produces insulin?', 'Liver', 'Kidney', 'Heart', 'Pancreas', 3, 20),
           (9, 'At sea level, water boils at what temperature?', '90 °C', '100 °C', '110 °C', '120 °C', 1, 10),
           (10, 'What is the most common gas in Earth''s atmosphere?', 'Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide', 0, 20)
         ) as v (position, prompt, a, b, c, d, correct, timeLimit)
   where q.title = 'Lab Coats On';
