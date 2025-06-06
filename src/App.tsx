import React, { JSX, useCallback, useEffect, useState, useRef } from 'react';
import './App.css';

export default function App() {
  const [currentText, setText] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [center, setCenter] = useState<string>("");
  const [letters, setLetters] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [found, setFound] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [menu, setMenu] = useState<boolean>(false);
  const loading = useRef<boolean>(false);
  const remaining: number = answers.size;
  const guessed: number = found.length;

  function handleText(letter :string): void{
    setText(prev=>prev+letter);
  }

  function deleteText(): void{
    setText(prev=>prev.slice(0,-1));
  }

  function shuffleLetters(): void{
    setLetters(shuffle(letters));
  }

  // handles score and incorrect answer popups
  function showPopUp(info: string){
    const notif: HTMLDivElement = document.createElement("div");
    notif.className = "notif";
    notif.innerText = info;
    document.getElementById("notif-container")?.replaceChildren(notif);
    setTimeout(()=>notif.remove(), 1500);
  }

  //clears input and checks if a submitted guess was a possible solution, displays a popup with points or reason for rejection
  function checkGuess(): void{
    if(currentText.length !== 0){
      if(currentText.length < 4){
        showPopUp("Too short");
      }else if(!currentText.includes(center)){
        showPopUp("Does not contain center letter")
      }else if(found.includes(currentText)){
        showPopUp("Already Found");
      }else if(answers.has(currentText)){
        const points: number = answers.get(currentText)!;
        setScore(prev => prev + points);
        showPopUp("+"+points);
        
        let tempMap: Map<string,number> = new Map(answers);
        tempMap.delete(currentText);
        setAnswers(tempMap);

        let tempFound: string[] = [...found];
        tempFound.push(currentText);
        setFound(tempFound);
      }else{
        showPopUp("Not in word list");
      }
      setText("");
    }
  }

  const saveGame = useCallback(() =>{
    localStorage.setItem("session", JSON.stringify({
      score,
      maxScore,
      found,
      center,
      letters,
      darkMode,
      answers: Array.from(answers.entries()),
    }));
  }, [answers, center, found, letters, score, maxScore, darkMode]);
  
  //starts a new game, resets everything to starting values and picks a new word and solutions
  const newGame:(diff: boolean) => Promise<void> = useCallback(async (diff: boolean): Promise<void> => {
    loading.current = true;
    setMenu(false);
    setText("");
    setScore(0);
    setMaxScore(0);
    setFound([]);
    const word: string = await select_word(diff);
    let strarr: string[] = [...new Set<string>(word)];
    strarr = shuffle(strarr);
    
    const newAnswers: Map<string, number> = calculateScores(await solutionFinder(strarr, strarr[0], diff));
    let max : number = 0;
    for(const value of newAnswers.values()) 
      max+= value;

    setMaxScore(max);
    setAnswers(newAnswers);
    setCenter(strarr.shift()!);
    setLetters(strarr);

    saveGame();
    loading.current = false;
  }, [saveGame]);

  //Loads previous sessions, saves progress, and starts new games when needed
  useEffect(()=> {
    if(loading.current)
      return;
    const saved: string | null = localStorage.getItem("session");
    if(!saved){
      newGame(true);
    }else if(answers.size === 0){
      if(maxScore === 0){
        const saveState = JSON.parse(saved);
        setScore(saveState.score);
        setMaxScore(saveState.maxScore);
        setFound(saveState.found);
        setLetters(saveState.letters);
        setCenter(saveState.center);
        setDarkMode(saveState.darkMode);
        setAnswers(new Map(saveState.answers));
      }else{
        saveGame();
        setMenu(true);
      }
    }else{
      saveGame();
    }
  }, [answers, center, found, letters, score, maxScore, darkMode, newGame, saveGame]);
  

  return (
    <div className={darkMode ? "dark-mode" : "App"}>
      <div className="header">
        <div className ="logo-box">
          <img className ="logo" alt="Word Wasp logo" src ="word-wasp.svg"></img>
        </div>
        <div className="title">Word Wasp</div>
        <div className="header-element-container">

          <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
            <svg className="toggle-body" viewBox ="0 0 24 24" > <circle className="toggle"/></svg>
            <svg className="sun"  viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
            <svg className = "moon" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>

          <svg role="button" className="new-button"  viewBox="0 0 24 24" strokeLinecap="square" strokeLinejoin="round" onClick={() => setMenu(!menu)}>
            <circle cx="12" cy="12" r="10" ></circle>
            <line className="line" x1="12" y1="8" x2="12" y2="16"></line>
            <line className="line" x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </div>
      </div>

      <div className="unsupported">Unsupported screen size.</div>
      {menu && (<div className="cover">
        <div className="menu">
          <div className ="menu-heading">New Puzzle?</div>
          <svg role="button" className ="x-button" onClick={() => setMenu(false)} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <div className ="menu-body">{answers.size === 0 ? "Puzzle complete!" : "All current progress will be lost!"}</div>
          <div className ="menu-button-row">
            <button className="button" id="diff-button" onClick={() => {setMenu(false); newGame(true)}}>Easy</button>
            <button className="button" id="diff-button" onClick={() => {setMenu(false); newGame(false)}}>Hard</button>
          </div>
        </div>
      </div>)}

      <div className = "main">
        <div className = "game-box">
          <div id = "notif-container"></div>
          <div className = "text-input">
            {currentText.split("").map((char, idx) => (
              <span key={idx} {...char === center ? {className:"center-letter"} :{}}  >
                {char}
              </span>
            ))}
            <span className = "cursor">|</span>
          </div>

          <Board letters={letters} center={center} onPressText = {handleText}/>
          <div className = "button-row">
              <button className = "button" id = "delete-button" onClick={deleteText}>Delete</button>
              <button className = "button" id = "refresh-button" onClick={shuffleLetters}>
                <svg className="refresh-symbol" viewBox="0 0 24 24" fill="none"  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              </button>
              <button className = "button" id = "guess-button" onClick={checkGuess}>Guess</button>
            </div>
        </div>

        <div className = "box">
            <div className = "box-heading">
              <div className = "guessed-text" >{guessed} words guessed 
                <span id ="hint">, {remaining} more </span>
              </div>
              <div className = "score-text">{score}/{maxScore} points </div>
            </div>
            <div className = "box-text-area">
              {found.map((word, idx) => (<span className="box-text" key = {idx}>{word}</span>))}
            </div>
        </div>

      </div>   
    </div>
  );
}

type HexProps = {
  letter: string;
  isCenter?: boolean;
  onPress: () => void;
}

//returns a hexagon shaped button with the specified letter and IDs it as center if necessary
function Hex({letter, isCenter = false , onPress} :HexProps): JSX.Element{
  return (
  <svg role="button" onClick = {onPress} className="comb" viewBox="0 0 100 90">
    <polygon className="hex" {...isCenter ? {id:"center-hex"} :{}} points="0,43.30127 25,0 75,0 100,43.30127, 75,86.60254 25,86.60254"></polygon>
    <text className="letter" x="50%" y="50%" >{letter}</text>
  </svg>
  );
}

type BoardProps = {
  letters: string[];
  center: string;
  onPressText: (char: string) => void;
}

//returns a board with all the hexes
function Board({letters, center, onPressText}: BoardProps): JSX.Element{
  return (
    <div className="hive">
      <div className="hive-out">
        <Hex letter={letters[0]} onPress={()=> onPressText(letters[0])} />
        <Hex letter={letters[1]} onPress={()=> onPressText(letters[1])} />
      </div>

      <div className="hive-mid">
        <Hex letter={letters[2]} onPress={()=> onPressText(letters[2])} />
        <Hex letter={center} isCenter = {true} onPress={()=> onPressText(center)} />
        <Hex letter={letters[3]} onPress={()=> onPressText(letters[3])} />
      </div>

      <div className="hive-out">
        <Hex letter={letters[4]} onPress={()=> onPressText(letters[4])} />
        <Hex letter={letters[5]} onPress={()=> onPressText(letters[5])} />
      </div> 
    </div>
  );
}

//randomly grabs a word from a textfile.
async function select_word(easy: boolean): Promise<string>{
  const file: string = easy ? "easy_puzzles.txt" : "hard_puzzles.txt";
  const choices: string[] = (await (await fetch(file)).text()).split(/\r?\n/);
  const bee: string = choices[Math.floor(Math.random() * choices.length)];
  return bee;
}

//Given the letters and center of a given puzzle, returns all solutions from a textfile
async function solutionFinder(bee: string[], center: string, easy: boolean): Promise<string[]>{
  const file: string = easy ? "easy_words.txt" : "hard_words.txt";
  const letters: Set<string> = new Set(bee);
  const answers: string[] = (await (await fetch(file)).text()).split(/\r?\n/).filter(word => word.includes(center)).filter(word => [...word].every(char => letters.has(char)));
  return answers;
}

//calculates and maps the scores for every word in a provided array
function calculateScores(words:string[]): Map<string, number>{
  let scoresheet: Map<string, number> = new Map<string, number>();
    
  for(let i: number = 0; i < words.length; i++){
    let points : number = 1;
    if (words[i].length > 4){
      points = words[i].length;
      //Pangrams give bonus points in spelling bee
      if (new Set(words[i]).size === 7)
        points += 7;
    }
    scoresheet.set(words[i], points);
  }
    
  return scoresheet;
}

//shuffles array
function shuffle<T>(arr: T[]): T[]{
    const arrr: T[] = [...arr];
    for (let i: number = arrr.length-1; i > 0; i--){
      let j = Math.floor(Math.random()*(i+1));
      let k = arrr[i];
      arrr[i] = arrr[j];
      arrr[j] = k;
    }
    return arrr;
  }