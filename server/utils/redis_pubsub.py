import json
import os
import time

import redis

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))


def get_redis():
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)


def wait_for_payment_status(transaction_id, timeout=90):
    r = get_redis()
    pubsub = r.pubsub()
    channel = f"payment_status:{transaction_id}"
    pubsub.subscribe(channel)
    start = time.time()
    for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            pubsub.unsubscribe(channel)
            return data["status"]
        if time.time() - start > timeout:
            pubsub.unsubscribe(channel)
            return None


def notify_payment_status(transaction_id, status):
    r = get_redis()
    channel = f"payment_status:{transaction_id}"
    r.publish(channel, json.dumps({"status": status}))


def wait_for_payout_status_payout(payout_id, timeout=60):
    r = get_redis()
    pubsub = r.pubsub()
    channel = f"payout_status:{payout_id}"
    pubsub.subscribe(channel)
    start = time.time()
    for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            pubsub.unsubscribe(channel)
            return data["status"]
        if time.time() - start > timeout:
            pubsub.unsubscribe(channel)
            return None


def notify_payout_status(payout_id, status):
    r = get_redis()
    channel = f"payout_status:{payout_id}"
    r.publish(channel, json.dumps({"status": status}))


def wait_for_expense_status(expense_id, timeout=60):
    r = get_redis()
    pubsub = r.pubsub()
    channel = f"expense_status:{expense_id}"
    pubsub.subscribe(channel)
    start = time.time()
    for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            pubsub.unsubscribe(channel)
            return data["status"]
        if time.time() - start > timeout:
            pubsub.unsubscribe(channel)
            return None


def notify_expense_status(expense_id, status):
    r = get_redis()
    channel = f"expense_status:{expense_id}"
    r.publish(channel, json.dumps({"status": status}))
