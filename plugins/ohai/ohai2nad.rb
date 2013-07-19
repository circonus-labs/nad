# No shebang; We assume something has found ruby for us

require 'json'

# A more clever thing to do would be to run ohai as a gem, and interact intelligently
# require 'ohai'
# For today, cleverness--

def puts_nad (key, type, value)
  if value.nil? then
    puts "#{key}\t#{type}"
  else
    puts "#{key}\t#{type}\t#{value}"
  end
end

def handle_top_level(p, r)
  # this could be less dumb
  case p
  when *[
         # These are all simple scalars
         "uptime_seconds", 
         "hostname", 
         "fqdn", 
         "domain", 
         "os",
         "os_version", 
         "platform", 
         "platform_version", 
         "platform_family",
         "ipaddress", 
         "macaddress",
         "ohai_time",
        ]
    h_scalar(p,r)
  when *[
         # We ignore these explicitly
         "uptime", 
         "command",
         "languages",
         "chef_packages",
         "keys",
         "current_user",
         "idletime",
         "idletime_seconds",
         "memory",   # Nad provides vm.sh for this
         "block_device",
         "dmi",
         "lsb",
         "virtualization",
         "network", # Nad provides if.sh for this 
         "counters", # Nad provides if.sh for this 
        ]

  when "filesystem"
    h_filesystem(p,r) # custom
  when "etc"
    h_etc(p,r) # custom
  when "cpu"
    h_cpu(p,r) # custom
  when "kernel"
    h_kernel(p,r) # custom
  else
    # Ignore if unknown
    # puts "Unknown ohai plugin #{p}"
  end
end

def h_inspect(p,r)
  require 'pp'
  puts "----"
  puts p
  puts "----"
  pp r
end

def nad_type_scalar(v)
  if v.kind_of?(Fixnum) then
    return 'L'
  elsif v.kind_of?(Float) then
    return 'n'
  else
    return 's'
  end
end

def h_filesystem(p,r)
  r.each do |device, fs_details|
    next unless fs_details['mount']
    next unless fs_details['kb_size']

    puts_nad("filesystem`#{fs_details['mount']}`device",'s',device)
    fs_details.each do |key, value|
      next if (key == 'mount_options')
      next if (key == 'mount') # we invert this

      # Ohai reports these all as strings, boo
      if ['kb_size', 'kb_available', 'kb_used', 'percent_used'].include?(key) then
        value = value.sub('%', '').to_i
      end

      puts_nad("filesystem`#{fs_details['mount']}`#{key}",nad_type_scalar(value),value)
    end
  end
end

def h_etc(p,r)
  # Here we just list the count of users and groups
  puts_nad('etc`user_count', 'L', r['passwd'].keys.size)
  puts_nad('etc`group_count', 'L', r['group'].keys.size)
end

def h_cpu(p,r)
  # List cpu count, and model info for each
  puts_nad('cpu`total', 'L', r['total'])
  puts_nad('cpu`total', 'L', r['real'])
  r.select{|k,v| k.match(/^\d+$/)}.each do |cpu_id, details|
    puts_nad("cpu`#{cpu_id}`model_name", 's', r[cpu_id]['model_name'])
  end
end

def h_kernel(p,r)
  # List everything but the module list
  r.reject{|k,v| k == 'modules' }.each do |k,v|
    puts_nad("kernel`#{k}", 's', v)
  end
end

def h_scalar(p,r)
  puts_nad(p,nad_type_scalar(r),r)
end

def main
  ohai_json = `ohai`
  ohai_data = JSON.parse(ohai_json)
  
  ohai_data.each do |ohai_plugin, results|
    handle_top_level(ohai_plugin, results)
  end
end

main()
