import eel
import socket
import re
import requests
import traceback
import time
import xml.etree.ElementTree as ET

eel.init('web')

def get_device_info(ip):
    try:
        url = f"http://{ip}:8060/query/device-info"
        response = requests.get(url, timeout=5)
        response.raise_for_status()

        root = ET.fromstring(response.content)
        user_device_name = root.find('.//user-device-name').text if root.find('.//user-device-name') is not None else None
        return user_device_name

    except requests.exceptions.RequestException as e:
        print(f"Error getting device info for {ip}: {e}")
        traceback.print_exc()
        return None
    except ET.ParseError as e:
        print(f"Error parsing XML for {ip}: {e}")
        traceback.print_exc()
        return None

def discover_rokus(timeout=5):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.settimeout(timeout)
        sock.bind(('', 1900))

        st = 'roku:ecp'
        mx = 3
        man = '"ssdp:discover"'
        pt = f'ST: {st}\r\nMX: {mx}\r\nMAN: {man}\r\n'
        message = f'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\n{pt}\r\n'

        print("Sending SSDP M-SEARCH request:")
        print(message)

        sock.sendto(message.encode(), ('239.255.255.250', 1900))

        roku_ips = []
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                sock.settimeout(timeout - (time.time() - start_time))
                data, addr = sock.recvfrom(1024)
                data_str = data.decode()
                print("\nRaw SSDP Response:")
                print(data_str)
                print(f"Received from: {addr}")

                location_match = re.search(r"LOCATION: (.+)\r\n", data_str)
                if location_match:
                    location = location_match.group(1)
                    try:
                        roku_ip = location.split('//')[1].split(':')[0]
                        if roku_ip not in roku_ips:
                            roku_ips.append(roku_ip)
                    except IndexError:
                        print("Error parsing location URL.")
                        traceback.print_exc()
            except socket.timeout:
                print("SSDP discovery timed out.")
                break
            except Exception as inner_e:
                error_message = f"Inner exception during response processing: {inner_e}"
                print(error_message)
                traceback.print_exc()
                return {"error": error_message, "roku_ips": []}
        return {"error": None, "roku_ips": roku_ips}
    except Exception as e:
        error_message = f"Outer exception during discovery setup: {e}"
        print(error_message)
        traceback.print_exc()
        return {"error": error_message, "roku_ips": []}

@eel.expose
def discover_rokus_eel():
    result = discover_rokus()
    if result["roku_ips"]:
        device_info_list = []
        for ip in result["roku_ips"]:
            device_name = get_device_info(ip)
            device_info_list.append({"ip": ip, "name": device_name})
        return {"error": None, "devices": device_info_list}
    return result

@eel.expose
def send_keypress(roku_ip, key):
    url = f"http://{roku_ip}:8060/keypress/{key}"
    try:
        response = requests.post(url, data="true", headers={'Content-Type': 'text/plain'}, timeout=5)
        response.raise_for_status()
        print(f"Keypress '{key}' sent successfully to {roku_ip}")
        return {"success": True, "message": "Key sent"}
    except requests.exceptions.RequestException as e:
        error_message = f"Error sending keypress: {e}"
        print(error_message)
        traceback.print_exc()
        return {"success": False, "message": error_message}

@eel.expose
def test_connection(roku_ip):
    device_name = get_device_info(roku_ip)
    try:
        url = f"http://{roku_ip}:8060/query/device-info"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return {"success": True, "message": "Connection successful", "deviceName": device_name}
    except requests.exceptions.RequestException as e:
        error_message = f"Error testing connection: {e}"
        print(error_message)
        traceback.print_exc()
        return {"success": False, "message": error_message}

eel.start('index.html', size=(400, 600))