import urllib.request
import urllib.parse
import json
import xml.etree.ElementTree as ET
import os

API_KEY = os.environ.get('HOTPEPPER_API_KEY', '')
HOTPEPPER_URL = 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/'

def handler(request):
    params = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(request.url).query))
    params['key'] = API_KEY

    query = urllib.parse.urlencode(params)
    url = f'{HOTPEPPER_URL}?{query}'

    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            xml_data = resp.read().decode('utf-8')

        root = ET.fromstring(xml_data)
        ns = {'': 'http://webservice.recruit.co.jp/HotPepper/'}

        shops = []
        for shop in root.findall('shop', ns):
            def g(tag):
                el = shop.find(tag, ns)
                return el.text if el is not None else ''

            def gn(parent_tag, child_tag):
                p = shop.find(parent_tag, ns)
                if p is None:
                    return ''
                c = p.find(child_tag, ns)
                return c.text if c is not None else ''

            photo_url = ''
            photo = shop.find('photo', ns)
            if photo is not None:
                pc = photo.find('pc', ns)
                if pc is not None:
                    l_el = pc.find('l', ns)
                    if l_el is not None:
                        photo_url = l_el.text or ''

            shops.append({
                'name': g('name'),
                'address': g('address'),
                'capacity': g('capacity'),
                'private_room': g('private_room'),
                'parking': g('parking'),
                'free_drink': g('free_drink'),
                'non_smoking': g('non_smoking'),
                'genre': {'name': gn('genre', 'name')},
                'sub_genre': {'name': gn('sub_genre', 'name')},
                'budget': {
                    'average': gn('budget', 'average'),
                    'name': gn('budget', 'name'),
                },
                'photo': {'pc': {'l': photo_url}},
                'urls': {'pc': gn('urls', 'pc')},
                'catch': g('catch'),
                'access': g('access'),
                'open': g('open'),
            })

        result = {
            'results': {
                'shop': shops,
                'results_available': root.findtext('results_available', namespaces=ns) or '0',
            }
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps(result, ensure_ascii=False),
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)}),
        }
