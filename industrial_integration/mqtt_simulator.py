import time
import json
import random
import sys

# Attempt to import paho-mqtt
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    print("Warning: 'paho-mqtt' package not found. Simulator will run in console-only fallback mode.")
    print("To install MQTT client: pip install paho-mqtt")

BROKER = "broker.emqx.io"
PORT = 1883
CMD_TOPIC = "factorypulse/conveyor/cmd"
STATUS_TOPIC = "factorypulse/conveyor/status"

# Simulator State
conveyor_state = {
    "name": "MAIN_CONVEYOR",
    "is_running": False,
    "speed_mps": 0.0,
    "direction": "FORWARD",
    "motor_temp": 34.5,
    "status": "IDLE",
    "error_message": "",
    "cargo": None
}

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT Broker ({BROKER}:{PORT}) with result code {rc}")
    client.subscribe(CMD_TOPIC)
    print(f"Subscribed to control topic: {CMD_TOPIC}")

def on_message(client, userdata, msg):
    global conveyor_state
    try:
        payload = json.loads(msg.payload.decode())
        cmd = payload.get("command", "").upper()
        print(f"Received WCS Command: {cmd} with details {payload}")
        
        if cmd == "START":
            conveyor_state["is_running"] = True
            conveyor_state["speed_mps"] = payload.get("speed", 0.8)
            conveyor_state["status"] = "ACTIVE"
            conveyor_state["error_message"] = ""
        elif cmd == "STOP":
            conveyor_state["is_running"] = False
            conveyor_state["speed_mps"] = 0.0
            conveyor_state["status"] = "IDLE"
        elif cmd == "REVERSE":
            conveyor_state["direction"] = "REVERSE" if conveyor_state["direction"] == "FORWARD" else "FORWARD"
        elif cmd == "TRIGGER_FAULT":
            conveyor_state["is_running"] = False
            conveyor_state["speed_mps"] = 0.0
            conveyor_state["status"] = "FAULTED"
            conveyor_state["error_message"] = "Thermal trip alarm detected."
            conveyor_state["motor_temp"] = 82.5
        elif cmd == "CLEAR_FAULT":
            conveyor_state["status"] = "IDLE"
            conveyor_state["is_running"] = False
            conveyor_state["speed_mps"] = 0.0
            conveyor_state["error_message"] = ""
            conveyor_state["motor_temp"] = 35.0
            
        # Immediately publish updated state
        publish_state(client)
    except Exception as e:
        print(f"Error handling WCS MQTT message: {e}")

def publish_state(client):
    # Simulated heat change depending on running status
    if conveyor_state["is_running"]:
        conveyor_state["motor_temp"] += random.uniform(0.1, 0.4)
        if conveyor_state["motor_temp"] > 65.0:
            conveyor_state["motor_temp"] = 65.0
    else:
        conveyor_state["motor_temp"] -= random.uniform(0.2, 0.5)
        if conveyor_state["motor_temp"] < 34.0:
            conveyor_state["motor_temp"] = 34.0
            
    payload = json.dumps(conveyor_state)
    if MQTT_AVAILABLE:
        client.publish(STATUS_TOPIC, payload)
        print(f"Published Conveyor Telemetry: {STATUS_TOPIC} -> {payload}")
    else:
        print(f"[Simulated Output] Telemetry -> {payload}")

def run_simulator():
    client = None
    if MQTT_AVAILABLE:
        client = mqtt.Client()
        client.on_connect = on_connect
        client.on_message = on_message
        try:
            client.connect(BROKER, PORT, 60)
            client.loop_start()
        except Exception as conn_err:
            print(f"Could not connect to broker: {conn_err}. Operating in offline loop.")
            
    print("FactoryPulse WCS Conveyor Simulator is running. Press Ctrl+C to stop.")
    
    try:
        while True:
            # Regularly publish conveyor status tick
            publish_state(client)
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nStopping Conveyor Simulator...")
        if MQTT_AVAILABLE and client:
            client.loop_stop()
            client.disconnect()

if __name__ == "__main__":
    run_simulator()
