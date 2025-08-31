from user_agents import parse


def get_request_meta(request):
    return {
        'ip_address': get_client_ip(request),
        'browser': get_browser_info(request),
        'operating_system': get_os_info(request),
        'path': request.path,
    }


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_browser_info(request):
    user_agent_string = request.META.get('HTTP_USER_AGENT', '')
    user_agent = parse(user_agent_string)
    return user_agent.browser.family  # e.g., Chrome, Edge, Safari


def get_os_info(request):
    user_agent_string = request.META.get('HTTP_USER_AGENT', '')
    user_agent = parse(user_agent_string)
    return user_agent.os.family  # e.g., Mac OS X, Windows, Linux
