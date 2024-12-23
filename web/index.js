const rokuStatus = document.getElementById('roku-status');
const remoteControls = document.getElementById('remote-controls');
const rokuIPInput = document.getElementById('rokuIP');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const discoverButton = document.querySelector('#connection-controls button:nth-child(3)');
const rokuList = document.getElementById('rokuList');
const connectionControls = document.getElementById('connection-controls');
const manualConnectHeader = document.getElementById('manualConnectHeader');
const manualConnectContent = document.getElementById('manualConnectContent');

let connected = false;
let rokuIP;
let connectedDeviceName;
let isDiscovering = false;

async function discoverRokus() {
    if (isDiscovering) {
        return;
    }

    rokuList.innerHTML = '';
    isDiscovering = true;
    discoverButton.disabled = true;
    rokuStatus.textContent = "Scanning for Rokus...";

    try {
        let result = await eel.discover_rokus_eel()();

        if (!result) {
            console.error("Discovery returned no result.");
            rokuStatus.textContent = "Discovery returned no result. Check console for details.";
            return;
        }

        let devices = result.devices;
        let error = result.error;

        if (error) {
            rokuStatus.textContent = "Discovery Error: " + error;
            console.error("Discovery Error Details:", error);
            return;
        }

        if (!devices || devices.length === 0) {
            rokuStatus.textContent = "No Roku devices found.";
            return;
        }

        rokuList.innerHTML = '';
        devices.forEach(device => {
            const displayName = device.name ? `${device.name} (${device.ip})` : `Unknown Device (${device.ip})`;
            const li = document.createElement('li');
            li.textContent = displayName;
            li.addEventListener('click', () => {
                rokuIPInput.value = device.ip;
                rokuList.classList.remove("visible");
                connectToRoku();
            });
            rokuList.appendChild(li);
        });
        rokuList.classList.add("visible");
    } catch (error) {
        console.error("JavaScript Error during discovery:", error);
        rokuStatus.textContent = "JavaScript Error during discovery.";
    } finally {
        isDiscovering = false;
        discoverButton.disabled = false;
        rokuStatus.textContent = "Discovery Finished";
        setTimeout(() => {
            rokuStatus.textContent = "";
        }, 5000);
    }
}

async function connectToRoku() {
    rokuIP = rokuIPInput.value.trim();
    if (!rokuIP) {
        alert("Please enter a valid Roku IP address.");
        return;
    }
    try {
        let result = await eel.test_connection(rokuIP)();
        if (result.success) {
            connected = true;
            connectedDeviceName = result.deviceName;
            rokuStatus.textContent = `Connected to ${connectedDeviceName ? connectedDeviceName : "Roku at " + rokuIP}`;
            remoteControls.style.display = 'grid';
            connectionControls.style.display = "none";
            disconnectButton.style.display = 'block';
        } else {
            connected = false;
            rokuStatus.textContent = `Failed to connect to Roku at ${rokuIP}: ${result.message}`;
            remoteControls.style.display = 'none';
        }
    } catch (error) {
        connected = false;
        rokuStatus.textContent = `Error connecting to Roku: ${error}`;
        remoteControls.style.display = 'none';
    }
}

function disconnectFromRoku() {
    connected = false;
    connectedDeviceName = null; // Clear the device name
    rokuStatus.textContent = "Disconnected";
    remoteControls.style.display = 'none';
    connectionControls.style.display = "flex";
    rokuIPInput.value = "";
    rokuList.classList.remove("visible");
    disconnectButton.style.display = 'none';
}document.addEventListener('keydown', function(event) {
  let key = event.key;
  if (connected) {
  if (key === "Backspace") {
      sendKey("Backspace");
  } else if (key === "Enter"){
    sendKey("select")
  } else if (key === "ArrowUp"){
    sendKey("up")
  } else if (key === "ArrowDown"){
    sendKey("down")
  } else if (key === "ArrowLeft"){
    sendKey("left")
  } else if (key === "ArrowRight"){
    sendKey("right")
  } else if (key === "Escape"){
    sendKey("back")
  }
  else if (key.length === 1 && key.charCodeAt(0) <= 127) {
      const encodedKey = encodeURIComponent(key);
      sendKey("lit_" + encodedKey); // Add "lit_" prefix
  } else {
      console.log("Key ignored (not single ASCII or Backspace):", key);
  }}
});
async function sendKey(key) {
    if (!connected) {
        alert("Please connect to a Roku device first.");
        return;
    }
    try {
        let result = await eel.send_keypress(rokuIP, key)();
        if (!result.success) {
            alert(result.message);
        }
    } catch (error) {
        console.error("Error sending keypress", error);
    }
}

manualConnectHeader.addEventListener('click', () => {
    manualConnectContent.classList.toggle('visible');
    manualConnectHeader.querySelector('i').classList.toggle('fa-caret-down');
    manualConnectHeader.querySelector('i').classList.toggle('fa-caret-up');
    connectionControls.classList.toggle('dropdown-open');
});

window.onload = discoverRokus;