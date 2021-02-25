// This React app maintains a simple inventory list.
// The design goal was to put all of the functions in
// a single file to help study how they work.

// Mongodb/Atlas storage is accessed via a Heroku api.
// by John Phillips on 2021-02-24 revised 2021-02-25

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Style.css";

//
// ***** API functions *******************************************************
// These functions call the api running on a Heroku server
// and carries out the desired interaction with a mongodb Atlas database.

// const dbGetAllData = async (setRowDataArray) => { // alternative syntax
async function dbGetAllData(setRowDataArray) {
  await axios
    .get("https://inventorylistapi.herokuapp.com/items")
    .then((response) => {
      setRowDataArray(response.data);
    });
}

async function dbAddNewRow(itemName, qty) {
  const uri = "https://inventorylistapi.herokuapp.com/items";
  const payload = { name: itemName, qty: qty };
  let result = await axios.post(uri, payload);
  console.log(`db add new row res.data=${result.data}`);
  return result.data;
}

async function dbUpdateRow(row2update, qty) {
  // for now update based on item name instead of id... fix api later
  const uri = "https://inventorylistapi.herokuapp.com/items/" + row2update.name;
  const payload = { qty: qty };
  let result = await axios.put(uri, payload);
  return result.data;
}

async function dbRemoveRow(myId) {
  const uri = "https://inventorylistapi.herokuapp.com/items/" + myId;
  let result = await axios.delete(uri);
  console.log(`db remove=${result.data.deletedCount}`); // make sure it is 1
  return result.data.deletedCount;
}
// ***** End API functions ***************************************************
//

//
// ***** Main React function *************************************************
export default function App() {
  console.log("start of function App.js");

  // Create the state array and a function to change the data.
  // rowDataArray contains all of our list data organized by row.
  let [rowDataArray, setRowDataArray] = useState([]);

  useEffect(() => {
    console.log("first useEffect -- run one time to get the starting data");
    dbGetAllData(setRowDataArray);
    console.log(rowDataArray);
    // ignore the following [] warning
  }, []); // actually need the empty dependency array [] so only executed once

  // Any time rowDataArray changes then this hook will automatically be called.
  // Uncomment the following to console view the rowDataArray as it is updated.
  useEffect(() => {
    console.log("second useEffect runs whenever the rowDataArray changes");
    console.log(rowDataArray);
  }, [rowDataArray]);

  async function addNewRow(itemName, qty) {
    // add row to db and get new id back
    let newId = await dbAddNewRow(itemName, qty);
    const newRow = { _id: newId, name: itemName, qty: qty };
    setRowDataArray([...rowDataArray, newRow]);
  }

  function updateRow(row2update, qty) {
    // just update qty and leave name and id as is
    const updatedRow = { _id: row2update._id, name: row2update.name, qty: qty };
    // check each row for the matching id and if found return the updated row
    const updatedItems = rowDataArray.map((row) => {
      if (row._id === row2update._id) {
        return updatedRow;
      }
      return row;
    });
    setRowDataArray(updatedItems);
    dbUpdateRow(row2update, qty);
  }

  function removeRow(id2delete) {
    // filter out any row where the ids don't match
    const updatedItems = rowDataArray.filter((row) => row._id !== id2delete);
    setRowDataArray(updatedItems);
    dbRemoveRow(id2delete);
  }

  return (
    <div>
      <div className="Wrapper">
        <h1>Inventory List</h1>
        <p>
          React App -&gt; Express / Node server on Heroku -&gt; Mongodb / Atlas
        </p>
        <InputForm addNewRow={addNewRow} className="InputForm" />
        <div className="ListContainer">
          <ul>
            {rowDataArray.map((oneRow) => (
              <li key={oneRow._id}>
                <ListRow
                  oneRow={oneRow}
                  remove={removeRow}
                  update={updateRow}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Footer />
    </div>
  );
}
// ***** End Main function ***************************************************
// export default InventoryListNoStorage;

// Displays a single row of data with delete and edit buttons.
// It needs to be a separate function so that each row can
// have its own isEditing toggle.
function ListRow({ oneRow, remove, update }) {
  const [isEditing, toggle] = useToggle(false);
  return (
    <div>
      {isEditing ? (
        <EditRowForm oneRow={oneRow} update={update} toggle={toggle} />
      ) : (
        // span to wrap elements and later add style
        <span>
          <span>
            {oneRow.name} : {oneRow.qty}
          </span>
          <span className="ButtonGroup">
            <button
              className="Button"
              aria-label="Delete"
              onClick={() => remove(oneRow._id)}
            >
              Delete
            </button>
            <button className="Button" aria-label="Edit" onClick={toggle}>
              Edit
            </button>
          </span>
        </span>
      )}
    </div>
  );
}

// display's empty item name and qty text fields; when submitted it
// adds a new row to the data array
function InputForm({ addNewRow }) {
  const [name, handleNameChange, resetNameField] = useInputState("");
  const [qty, handleQtyChange, resetQtyField] = useInputState("");

  // next 2 lines enable the focus to return to the first textbox
  // after the 'add new item' button is clicked
  const textInput = React.createRef();
  const focus = () => textInput.current.focus();

  return (
    <form
      className="InputForm"
      onSubmit={(e) => {
        e.preventDefault();
        addNewRow(name, qty);
        resetNameField();
        resetQtyField();
        focus(); // returns focus to first textbox after submit
      }}
    >
      <input
        type="text"
        value={name}
        placeholder="Type new item name"
        onChange={handleNameChange}
        label="Add New Item"
        autoFocus
        ref={textInput} // returns focus to first textbox after submit
      />
      <input
        type="text"
        value={qty}
        placeholder="Type new quantity"
        onChange={handleQtyChange}
        label="Add New Quantity"
      />
      <button type="submit">Add new item</button>
    </form>
  );
}

// allows user to update an item's quantity
function EditRowForm({ oneRow, update, toggle }) {
  const [value, handleChange, reset] = useInputState(oneRow.qty);
  return (
    <form
      className="InputForm"
      onSubmit={(e) => {
        e.preventDefault();
        update(oneRow, value);
        reset();
        toggle();
      }}
    >
      {oneRow.name}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        label="Update quantity"
        autoFocus={true}
      />
      Press Enter to Update
    </form>
  );
}

// utility function to toggle a state from false to true and back
function useToggle(initialVal = false) {
  const [state, setState] = useState(initialVal);
  const toggle = () => setState(!state);
  return [state, toggle];
}

// utility functions to fill in a text field as the user types;
// resets the text field to "" after the user presses enter
function useInputState(initialVal) {
  const [value, setValue] = useState(initialVal);
  const handleChange = (e) => setValue(e.target.value);
  const reset = () => setValue("");
  return [value, handleChange, reset];
}

function Footer() {
  return (
    <p className="Footer">
      Simple Inventory List with Mongodb Atlas storage by John Phillips on
      Febuary 24, 2021. Source at{" "}
      <a href="https://github.com/profphillips/inventorylistfrontendapi">
        https://github.com/profphillips/inventorylistfrontendapi
      </a>
      . Live page at{" "}
      <a href="https://profphillips.github.io/inventorylistfrontendapi/">
        https://profphillips.github.io/inventorylistfrontendapi/
      </a>
      .
    </p>
  );
}

// ***** End Of File *********************************************************
