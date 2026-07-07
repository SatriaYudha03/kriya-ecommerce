terraform {
  required_version = ">= 1.5.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "hcloud_token" {
  type        = string
  description = "Hetzner Cloud API Token"
  sensitive   = true
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token"
  sensitive   = true
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID for the domain"
}

variable "domain_name" {
  type        = string
  description = "Domain name for the applications"
  default     = "kriya.my.id"
}

variable "server_type" {
  type        = string
  description = "Hetzner Server Type"
  default     = "cx22" # 2 vCPU, 4GB RAM - cukup untuk k3s + 3 service + n8n
}

variable "location" {
  type        = string
  description = "Hetzner Datacenter Location"
  default     = "hel1" # Helsinki (biasanya latency & cost optimal)
}

provider "hcloud" {
  token = var.hcloud_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "hcloud_ssh_key" "default" {
  name       = "kriya-devops-key"
  public_key = file("~/.ssh/id_rsa.pub")
}

resource "hcloud_firewall" "kriya" {
  name = "kriya-firewall"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "6443" # K3s API server (untuk kubectl remote)
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "kriya_server" {
  name        = "kriya-k3s-node"
  image       = "ubuntu-24.04"
  server_type = var.server_type
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.default.id]
  firewall_ids = [hcloud_firewall.kriya.id]

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }
}

resource "cloudflare_record" "wildcard" {
  zone_id = var.cloudflare_zone_id
  name    = "*"
  value   = hcloud_server.kriya_server.ipv4_address
  type    = "A"
  ttl     = 300
}

resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = hcloud_server.kriya_server.ipv4_address
  type    = "A"
  ttl     = 300
}

output "server_ipv4" {
  value       = hcloud_server.kriya_server.ipv4_address
  description = "Public IPv4 address of the Kriya server"
}
